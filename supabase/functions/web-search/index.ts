import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY mancante");

    const searchPrompt = `Fornisci una spiegazione completa e dettagliata sull'argomento: "${topic}".
     
Includi:
- Definizioni e concetti fondamentali
- Spiegazioni approfondite dei principi chiave
- Esempi pratici e applicazioni
- Date, nomi e fatti importanti
- Connessioni con altri argomenti correlati

Scrivi in italiano. Sii esaustivo ma chiaro, come un manuale di studio universitario.
Obiettivo: il testo deve essere sufficientemente ricco da poterci generare 8-15 mini-lezioni.
Scrivi almeno 3000 parole.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Sei un esperto accademico e docente universitario. Fornisci contenuti dettagliati, accurati e ben strutturati per lo studio. Rispondi sempre in italiano. Usa titoli, sottotitoli e punti elenco per organizzare il contenuto." },
          { role: "user", content: searchPrompt },
        ],
        temperature: 0.4,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("OpenRouter error:", aiResponse.status, errText);
      throw new Error("Errore nella generazione dei contenuti");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Nessun contenuto generato per questo argomento.");

    console.log(`Generated content length: ${content.length} chars`);

    // Save as a study context
    const { data: context, error: insertError } = await supabase
      .from("study_contexts")
      .insert({
        user_id: userId,
        file_name: `🌐 ${topic}`,
        content: content,
        processing_status: "completed",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Errore nel salvataggio del contenuto.");
    }

    console.log(`Web search content saved as context ${context.id}`);

    return successResponse({
      success: true,
      contextId: context.id,
      contentLength: content.length,
      topic,
    });

  } catch (error) {
    console.error("Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Errore sconosciuto");
  }
});
