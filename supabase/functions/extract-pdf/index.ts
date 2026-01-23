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

  try {
    const { userId, fileName, pdfBase64 } = await req.json();

    if (!userId || !fileName || !pdfBase64) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, fileName, pdfBase64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracting text from PDF: ${fileName} for user: ${userId}`);

    // Decode base64 PDF
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    
    // Extract text using basic approach - looking for text streams in PDF
    let extractedText = "";
    const decoder = new TextDecoder("latin1");
    const pdfString = decoder.decode(pdfBytes);
    
    // Find text between BT (begin text) and ET (end text) markers
    const textMatches = pdfString.matchAll(/BT\s*([\s\S]*?)\s*ET/g);
    for (const match of textMatches) {
      const textBlock = match[1];
      // Extract text from Tj and TJ operators
      const tjMatches = textBlock.matchAll(/\(([^)]*)\)\s*Tj/g);
      for (const tj of tjMatches) {
        extractedText += tj[1] + " ";
      }
      // Handle TJ arrays
      const tjArrayMatches = textBlock.matchAll(/\[(.*?)\]\s*TJ/g);
      for (const tja of tjArrayMatches) {
        const parts = tja[1].matchAll(/\(([^)]*)\)/g);
        for (const part of parts) {
          extractedText += part[1];
        }
        extractedText += " ";
      }
    }
    
    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\s+/g, " ")
      .trim();

    // If extraction failed, try to find readable text patterns
    if (extractedText.length < 100) {
      console.log("Basic extraction yielded little text, trying alternative method...");
      // Look for readable ASCII sequences
      const readableText = pdfString.match(/[\x20-\x7E]{10,}/g);
      if (readableText) {
        extractedText = readableText
          .filter(t => !t.includes("obj") && !t.includes("endobj") && !t.includes("stream"))
          .join(" ")
          .substring(0, 50000); // Limit to first 50k chars
      }
    }

    if (!extractedText || extractedText.length < 50) {
      return new Response(
        JSON.stringify({ 
          error: "Impossibile estrarre testo dal PDF. Assicurati che il PDF contenga testo selezionabile." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracted ${extractedText.length} characters`);

    // Initialize Supabase client with service role for bypassing RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store the extracted content
    const { data, error } = await supabase
      .from("study_contexts")
      .insert({
        user_id: userId,
        file_name: fileName,
        content: extractedText.substring(0, 100000), // Limit to 100k chars
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
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
