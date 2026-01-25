import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Maximum PDF size: 5MB base64 (roughly 3.75MB file)
const MAX_PDF_SIZE = 5 * 1024 * 1024;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, fileName, pdfBase64 } = await req.json();

    if (!userId || !fileName || !pdfBase64) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, fileName, pdfBase64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check file size
    if (pdfBase64.length > MAX_PDF_SIZE) {
      console.error(`PDF too large: ${pdfBase64.length} bytes (max: ${MAX_PDF_SIZE})`);
      return new Response(
        JSON.stringify({ 
          error: "Il PDF è troppo grande. Dimensione massima: 4MB. Prova a comprimere il file o dividerlo in parti più piccole." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracting text from PDF: ${fileName} for user: ${userId}, size: ${pdfBase64.length} chars`);

    // Extract text using lightweight method
    const extractedText = await extractTextFromPdf(pdfBase64);

    if (!extractedText || extractedText.length < 50) {
      return new Response(
        JSON.stringify({ 
          error: "Impossibile estrarre testo dal PDF. Assicurati che il PDF contenga testo selezionabile e non sia solo immagini." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracted ${extractedText.length} characters from PDF`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store the extracted content (limit to 100k chars)
    const { data, error } = await supabase
      .from("study_contexts")
      .insert({
        user_id: userId,
        file_name: fileName,
        content: extractedText.substring(0, 100000),
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Errore nel salvataggio del contenuto" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        contextId: data.id,
        extractedLength: extractedText.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Extract text from PDF using multiple strategies
 * Optimized for memory efficiency
 */
async function extractTextFromPdf(pdfBase64: string): Promise<string> {
  try {
    // Decode base64 in chunks to avoid memory spikes
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    
    // Use Latin1 decoder for PDF binary content
    const decoder = new TextDecoder("latin1");
    const pdfString = decoder.decode(pdfBytes);
    
    // Clear the bytes array to free memory
    pdfBytes.fill(0);

    const extractedParts: string[] = [];

    // Strategy 1: Extract text from stream objects (most common in PDFs)
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let match;
    
    while ((match = streamRegex.exec(pdfString)) !== null) {
      const streamContent = match[1];
      
      // Look for text operators in the stream
      const textMatches = streamContent.matchAll(/BT\s*([\s\S]*?)\s*ET/g);
      for (const textMatch of textMatches) {
        const textBlock = textMatch[1];
        
        // Extract Tj strings (single text)
        const tjMatches = textBlock.matchAll(/\(([^)]*)\)\s*Tj/g);
        for (const tj of tjMatches) {
          const text = cleanPdfText(tj[1]);
          if (text.length > 0) extractedParts.push(text);
        }
        
        // Extract TJ arrays (text with kerning)
        const tjArrayMatches = textBlock.matchAll(/\[(.*?)\]\s*TJ/gi);
        for (const tja of tjArrayMatches) {
          const parts = tja[1].matchAll(/\(([^)]*)\)/g);
          let lineText = "";
          for (const part of parts) {
            lineText += cleanPdfText(part[1]);
          }
          if (lineText.length > 0) extractedParts.push(lineText);
        }
      }
    }

    // Strategy 2: Extract plain text strings if Strategy 1 didn't work well
    if (extractedParts.join("").length < 200) {
      console.log("Strategy 1 yielded little text, trying Strategy 2...");
      
      // Look for readable ASCII sequences (avoiding PDF structure keywords)
      const readableMatches = pdfString.match(/[\x20-\x7E]{15,}/g) || [];
      const filteredText = readableMatches
        .filter(t => 
          !t.includes("obj") && 
          !t.includes("endobj") && 
          !t.includes("stream") && 
          !t.includes("xref") &&
          !t.includes("trailer") &&
          !t.includes("/Type") &&
          !t.includes("/Font") &&
          !t.includes("/Page") &&
          !t.match(/^[0-9\s]+$/) // Exclude pure numbers
        )
        .join(" ");
      
      if (filteredText.length > extractedParts.join(" ").length) {
        return cleanFinalText(filteredText);
      }
    }

    return cleanFinalText(extractedParts.join(" "));
    
  } catch (error) {
    console.error("Text extraction error:", error);
    throw new Error("Errore durante l'estrazione del testo dal PDF");
  }
}

/**
 * Clean PDF escape sequences and normalize text
 */
function cleanPdfText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
}

/**
 * Final text cleanup
 */
function cleanFinalText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
