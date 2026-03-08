import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    console.log(`Generating study plan for user: ${userId} (authenticated: ${auth.isAuthenticated})`);

    const { data: contexts } = await supabase.from("study_contexts").select("content, file_name").eq("user_id", userId);
    const { data: events } = await supabase.from("study_events").select("*").eq("user_id", userId).order("event_date", { ascending: true });

    if (!contexts || contexts.length === 0) {
      return errorResponse("Nessun contenuto di studio trovato. Carica dei PDF.", 400);
    }

    const { data: userProfile } = await supabase.from("user_profiles").select("institute_type, subject_levels").eq("user_id", userId).maybeSingle();

    const instituteMap: Record<string, string> = {
      liceo_scientifico: "Liceo Scientifico", liceo_classico: "Liceo Classico",
      liceo_linguistico: "Liceo Linguistico", istituto_tecnico: "Istituto Tecnico",
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

    const contextSummary = contexts
      .map((c: { file_name: string; content: string }) => `File: ${c.file_name}\nContenuto: ${c.content.substring(0, 2000)}...`)
      .join("\n\n").substring(0, 10000);

    const today = new Date().toISOString().split("T")[0];
    const eventsText = events && events.length > 0
      ? events.map((e: { event_type: string; title: string; subject: string; event_date: string }) => `- ${e.event_type}: ${e.title} (${e.subject}) - ${e.event_date}`).join("\n")
      : "Nessun evento programmato";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY mancante");

    const prompt = `Sei un tutor esperto che crea piani di studio personalizzati.
${profileInfo}

IMPORTANTE: Rispondi SOLO con un oggetto JSON valido, senza markdown.

JSON richiesto:
{
  "explanation": "Ti propongo questo piano perché...",
  "studySessions": [
    { "subject": "nome materia", "title": "cosa studiare", "date": "YYYY-MM-DD", "time": "HH:MM" }
  ]
}

Crea 3-5 sessioni nei prossimi 7 giorni. Data di oggi: ${today}

Eventi esistenti:
${eventsText}

Contenuti di studio:
${contextSummary}`;

    console.log("Calling Lovable AI Gateway for plan generation");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", errorText);
      throw new Error("Errore nella generazione del piano");
    }

    const aiData = await aiResponse.json();
    const responseContent = aiData.choices?.[0]?.message?.content;
    if (!responseContent) throw new Error("Risposta AI vuota");

    console.log("AI response:", responseContent.substring(0, 500));

    let plan;
    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      plan = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseContent);
    } catch {
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
