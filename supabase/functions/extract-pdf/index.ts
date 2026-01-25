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

    // Use Lovable AI (Gemini) to extract text from PDF
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Servizio AI non configurato" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Lovable AI with PDF content for extraction
    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Estrai TUTTO il testo contenuto in questo documento PDF. 
Restituisci SOLO il testo estratto, senza commenti, senza formattazione markdown, senza prefissi.
Mantieni la struttura originale del documento (paragrafi, elenchi, titoli).
Se ci sono tabelle, rappresentale in modo leggibile.
Estrai ogni singola parola presente nel documento.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 16000,
        temperature: 0,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Lovable AI error:", aiResponse.status, errorText);
      
      // Fallback to basic extraction if AI fails
      console.log("Falling back to basic text extraction...");
      return await fallbackExtraction(userId, fileName, pdfBase64);
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices?.[0]?.message?.content?.trim() || "";

    if (!extractedText || extractedText.length < 50) {
      console.log("AI extraction yielded little text, trying fallback...");
      return await fallbackExtraction(userId, fileName, pdfBase64);
    }

    console.log(`AI extracted ${extractedText.length} characters`);

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

// Fallback basic extraction for when AI fails
async function fallbackExtraction(userId: string, fileName: string, pdfBase64: string) {
  const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
  
  let extractedText = "";
  const decoder = new TextDecoder("latin1");
  const pdfString = decoder.decode(pdfBytes);
  
  // Find text between BT and ET markers
  const textMatches = pdfString.matchAll(/BT\s*([\s\S]*?)\s*ET/g);
  for (const match of textMatches) {
    const textBlock = match[1];
    const tjMatches = textBlock.matchAll(/\(([^)]*)\)\s*Tj/g);
    for (const tj of tjMatches) {
      extractedText += tj[1] + " ";
    }
    const tjArrayMatches = textBlock.matchAll(/\[(.*?)\]\s*TJ/g);
    for (const tja of tjArrayMatches) {
      const parts = tja[1].matchAll(/\(([^)]*)\)/g);
      for (const part of parts) {
        extractedText += part[1];
      }
      extractedText += " ";
    }
  }
  
  extractedText = extractedText
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\s+/g, " ")
    .trim();

  if (extractedText.length < 100) {
    const readableText = pdfString.match(/[\x20-\x7E]{10,}/g);
    if (readableText) {
      extractedText = readableText
        .filter(t => !t.includes("obj") && !t.includes("endobj") && !t.includes("stream"))
        .join(" ")
        .substring(0, 50000);
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

  console.log(`Fallback extracted ${extractedText.length} characters`);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
}
