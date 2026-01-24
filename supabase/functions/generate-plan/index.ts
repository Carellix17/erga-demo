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
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating study plan for user: ${userId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch study contexts
    const { data: contexts } = await supabase
      .from("study_contexts")
      .select("content, file_name")
      .eq("user_id", userId);

    // Fetch existing events
    const { data: events } = await supabase
      .from("study_events")
      .select("*")
      .eq("user_id", userId)
      .order("event_date", { ascending: true });

    if (!contexts || contexts.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nessun contenuto di studio trovato. Carica dei PDF." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare context summary
    const contextSummary = contexts
      .map(c => `File: ${c.file_name}\nContenuto: ${c.content.substring(0, 2000)}...`)
      .join("\n\n")
      .substring(0, 10000);

    // Prepare events summary
    const today = new Date().toISOString().split("T")[0];
    const eventsText = events && events.length > 0
      ? events.map(e => `- ${e.event_type}: ${e.title} (${e.subject}) - ${e.event_date}`).join("\n")
      : "Nessun evento programmato";

    // Call Groq API
    const GROQ_API_KEY = Deno.env.get("ERGA_DEMO_GROQ_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("ERGA_DEMO_GROQ_KEY is not configured");
    }

    const prompt = `Sei un tutor esperto che crea piani di studio personalizzati. Analizza il contenuto di studio e gli eventi esistenti per creare un piano ottimale.

IMPORTANTE: Rispondi SOLO con un oggetto JSON valido, senza markdown, senza codice.

Il JSON deve avere questa struttura:
{
  "explanation": "Ti propongo questo piano perché...",
  "studySessions": [
    {
      "subject": "nome materia",
      "title": "cosa studiare",
      "date": "YYYY-MM-DD",
      "time": "HH:MM"
    }
  ]
}

La spiegazione deve iniziare con "Ti propongo questo piano perché" e spiegare la logica delle scelte.
Crea 3-5 sessioni di studio nei prossimi 7 giorni.

Data di oggi: ${today}

Eventi esistenti:
${eventsText}

Contenuti di studio disponibili:
${contextSummary}

Crea un piano di studio personalizzato.`;

    console.log("Calling Groq API for plan generation");

    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Groq API error:", errorText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Troppe richieste. Riprova tra qualche secondo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Errore nella generazione del piano");
    }

    const aiData = await aiResponse.json();
    const responseContent = aiData.choices?.[0]?.message?.content;

    if (!responseContent) {
      throw new Error("Risposta AI vuota");
    }

    console.log("AI response:", responseContent.substring(0, 500));

    // Parse the plan
    let plan;
    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[0]);
      } else {
        plan = JSON.parse(responseContent);
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      throw new Error("Errore nel parsing del piano generato");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        plan: {
          explanation: plan.explanation || "Ti propongo questo piano basato sui tuoi materiali di studio.",
          studySessions: plan.studySessions || []
        }
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
