import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { topic } = body;

    if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
      return errorResponse("Inserisci un argomento valido (almeno 3 caratteri).", 400);
    }

    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    console.log(`Web search for user: ${userId}, topic: "${topic}"`);

    const PERPLEXITY_KEY = Deno.env.get("ERGA_DEMO_PERPLEXITY_KEY");
    if (!PERPLEXITY_KEY) throw new Error("ERGA_DEMO_PERPLEXITY_KEY mancante");

    // Search with Perplexity for comprehensive content
    const searchPrompt = `Fornisci una spiegazione completa e dettagliata sull'argomento: "${topic}".
    
Includi:
- Definizioni e concetti fondamentali
- Spiegazioni approfondite dei principi chiave
- Esempi pratici e applicazioni
- Connessioni con altri argomenti correlati

Scrivi in italiano. Sii esaustivo ma chiaro, come un manuale di studio universitario.
Obiettivo: il testo deve essere sufficientemente ricco da poterci generare 8-15 mini-lezioni.`;

    const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          { role: "system", content: "Sei un esperto accademico. Fornisci contenuti dettagliati e strutturati per lo studio. Rispondi sempre in italiano." },
          { role: "user", content: searchPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!perplexityResponse.ok) {
      const errText = await perplexityResponse.text();
      console.error("Perplexity error:", perplexityResponse.status, errText);
      if (perplexityResponse.status === 402) {
        throw new Error("Crediti di ricerca esauriti. Riprova più tardi.");
      }
      throw new Error("Errore nella ricerca web");
    }

    const perplexityData = await perplexityResponse.json();
    const content = perplexityData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Nessun risultato trovato per questo argomento.");

    const citations = perplexityData.citations || [];
    const sourcesNote = citations.length > 0
      ? `\n\nFonti: ${citations.slice(0, 5).join(", ")}`
      : "";

    const fullContent = content + sourcesNote;

    // Save as a study context
    const { data: context, error: insertError } = await supabase
      .from("study_contexts")
      .insert({
        user_id: userId,
        file_name: `🌐 ${topic}`,
        content: fullContent,
        processing_status: "completed",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Errore nel salvataggio del contenuto.");
    }

    console.log(`Web search content saved as context ${context.id}, length: ${fullContent.length}`);

    return successResponse({
      success: true,
      contextId: context.id,
      contentLength: fullContent.length,
      topic,
    });

  } catch (error) {
    console.error("Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Errore sconosciuto");
  }
});
