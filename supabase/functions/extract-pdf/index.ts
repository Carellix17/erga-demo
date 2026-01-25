import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { userId, fileName, filePath, contextId, action } = await req.json();

    // Action: process - Process an existing context record
    if (action === "process" && contextId) {
      console.log(`Processing PDF for context: ${contextId}`);
      
      // Get the context record
      const { data: context, error: fetchError } = await supabase
        .from("study_contexts")
        .select("*")
        .eq("id", contextId)
        .single();

      if (fetchError || !context) {
        console.error("Context not found:", fetchError);
        return new Response(
          JSON.stringify({ error: "Contesto non trovato" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update status to processing
      await supabase
        .from("study_contexts")
        .update({ processing_status: "processing" })
        .eq("id", contextId);

      try {
        // Download the PDF from storage
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from("study-pdfs")
          .download(context.file_path);

        if (downloadError || !fileData) {
          throw new Error("Impossibile scaricare il file: " + downloadError?.message);
        }

        // Convert to array buffer and extract text
        const arrayBuffer = await fileData.arrayBuffer();
        const pdfBytes = new Uint8Array(arrayBuffer);
        
        console.log(`Downloaded PDF: ${pdfBytes.length} bytes`);

        // Extract text from PDF
        const extractedText = extractTextFromPdf(pdfBytes);

        if (!extractedText || extractedText.length < 50) {
          throw new Error("Impossibile estrarre testo sufficiente dal PDF");
        }

        console.log(`Extracted ${extractedText.length} characters`);

        // Update context with extracted content
        const { error: updateError } = await supabase
          .from("study_contexts")
          .update({
            content: extractedText.substring(0, 100000),
            processing_status: "completed",
            error_message: null
          })
          .eq("id", contextId);

        if (updateError) {
          throw new Error("Errore nel salvataggio: " + updateError.message);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            contextId,
            extractedLength: extractedText.length 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (processError) {
        console.error("Processing error:", processError);
        
        // Mark as failed
        await supabase
          .from("study_contexts")
          .update({
            processing_status: "failed",
            error_message: processError instanceof Error ? processError.message : "Errore sconosciuto"
          })
          .eq("id", contextId);

        return new Response(
          JSON.stringify({ 
            error: processError instanceof Error ? processError.message : "Errore durante l'elaborazione" 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Action: register - Register a new upload (called after file is uploaded to storage)
    if (!userId || !fileName || !filePath) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, fileName, filePath" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Registering PDF upload: ${fileName} for user: ${userId}`);

    // Create study_contexts record with pending status
    const { data, error } = await supabase
      .from("study_contexts")
      .insert({
        user_id: userId,
        file_name: fileName,
        file_path: filePath,
        content: "", // Will be filled during processing
        processing_status: "pending"
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Errore nel salvataggio" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Start async processing (fire and forget)
    const processUrl = `${supabaseUrl}/functions/v1/extract-pdf`;
    fetch(processUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ action: "process", contextId: data.id }),
    }).catch(err => console.error("Background processing failed:", err));

    return new Response(
      JSON.stringify({ 
        success: true, 
        contextId: data.id,
        status: "processing"
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
 * Extract text from PDF bytes
 * Memory-efficient implementation
 */
function extractTextFromPdf(pdfBytes: Uint8Array): string {
  const decoder = new TextDecoder("latin1");
  const pdfString = decoder.decode(pdfBytes);

  const extractedParts: string[] = [];

  // Strategy 1: Extract text from BT...ET blocks
  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;

  while ((match = btEtRegex.exec(pdfString)) !== null) {
    const textBlock = match[1];

    // Extract Tj strings
    const tjMatches = textBlock.matchAll(/\(([^)]*)\)\s*Tj/g);
    for (const tj of tjMatches) {
      const text = cleanPdfText(tj[1]);
      if (text.length > 0) extractedParts.push(text);
    }

    // Extract TJ arrays
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

  // Strategy 2: Fallback to readable ASCII if little text found
  if (extractedParts.join("").length < 200) {
    console.log("Using fallback extraction strategy");
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
        !t.match(/^[0-9\s]+$/)
      )
      .join(" ");

    if (filteredText.length > extractedParts.join(" ").length) {
      return cleanFinalText(filteredText);
    }
  }

  return cleanFinalText(extractedParts.join(" "));
}

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

function cleanFinalText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
