import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validate authentication and get userId
    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    console.log(`Generating study plan for user: ${userId} (authenticated: ${auth.isAuthenticated})`);

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
      return errorResponse("Nessun contenuto di studio trovato. Carica dei PDF.", 400);
    }

    // Fetch user profile
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("institute_type, subject_levels")
      .eq("user_id", userId)
      .maybeSingle();

    const instituteMap: Record<string, string> = {
      liceo_scientifico: "Liceo Scientifico",
      liceo_classico: "Liceo Classico",
      liceo_linguistico: "Liceo Linguistico",
      istituto_tecnico: "Istituto Tecnico",
    };
    let profileInfo = "";
    if (userProfile) {
      profileInfo = `\nPROFILO STUDENTE: ${instituteMap[userProfile.institute_type] || userProfile.institute_type}`;
      if (userProfile.subject_levels && typeof userProfile.subject_levels === "object") {
        const levels = userProfile.subject_levels as Record<string, number>;
        profileInfo += "\nLivelli: " + Object.entries(levels).map(([s, l]) => `${s}: ${l}/10`).join(", ");
      }
      profileInfo += "\nDai più tempo alle materie dove lo studente ha un livello basso.";
    }

    // Prepare context summary
    const contextSummary = contexts
      .map((c: { file_name: string; content: string }) => `File: ${c.file_name}\nContenuto: ${c.content.substring(0, 2000)}...`)
      .join("\n\n")
      .substring(0, 10000);

    // Prepare events summary
    const today = new Date().toISOString().split("T")[0];
    const eventsText = events && events.length > 0
      ? events.map((e: { event_type: string; title: string; subject: string; event_date: string }) => 
          `- ${e.event_type}: ${e.title} (${e.subject}) - ${e.event_date}`
        ).join("\n")
      : "Nessun evento programmato";

    // Call Perplexity Sonar API
    const PERPLEXITY_API_KEY = Deno.env.get("ERGA_DEMO_PERPLEXITY_KEY");
    if (!PERPLEXITY_API_KEY) {
      throw new Error("ERGA_DEMO_PERPLEXITY_KEY is not configured");
    }

    const prompt = `Sei un tutor esperto che crea piani di studio personalizzati. Analizza il contenuto di studio e gli eventi esistenti per creare un piano ottimale.
${profileInfo}

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

    console.log("Calling Perplexity API for plan generation with sonar");

    const aiResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Perplexity API error:", errorText);
      if (aiResponse.status === 429) {
        return errorResponse("Troppe richieste. Riprova tra qualche secondo.", 429);
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

    return successResponse({ 
      success: true, 
      plan: {
        explanation: plan.explanation || "Ti propongo questo piano basato sui tuoi materiali di studio.",
        studySessions: plan.studySessions || []
      }
    });

  } catch (error) {
    console.error("Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});
