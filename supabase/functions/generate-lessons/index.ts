import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

// Configurazione Limiti
const MAX_CONTEXT_CHARS = 80000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, lessonIndex, contextId } = body;

    // Validate authentication and get userId
    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PERPLEXITY_API_KEY = Deno.env.get("ERGA_DEMO_PERPLEXITY_KEY");

    if (!PERPLEXITY_API_KEY) throw new Error("API Key mancante");

    console.log(`Generate lessons for user: ${userId} (authenticated: ${auth.isAuthenticated})`);

    // -----------------------------------------------------------------------
    // AZIONE 1: GENERA IL CONTENUTO DI UNA SINGOLA LEZIONE
    // -----------------------------------------------------------------------
    if (action === "generateLesson" && lessonIndex !== undefined) {
      // Recupera la lezione specifica
      let lessonsQuery = supabase.from("mini_lessons").select("*").eq("user_id", userId).eq("lesson_order", lessonIndex);
      if (contextId) lessonsQuery = lessonsQuery.eq("context_id", contextId);
      
      const { data: lessons } = await lessonsQuery.maybeSingle();
      if (!lessons) throw new Error("Lezione non trovata");
      if (lessons.is_generated) return successResponse({ success: true, lesson: lessons });

      // Recupera il contenuto del file
      let studyContent = "";
      if (lessons.context_id) {
        const { data: context } = await supabase.from("study_contexts").select("content, file_name").eq("id", lessons.context_id).single();
        if (context) studyContent = `FILE: ${context.file_name}\n${context.content}`.substring(0, MAX_CONTEXT_CHARS);
      } else {
        const { data: contexts } = await supabase.from("study_contexts").select("content, file_name").eq("user_id", userId);
        if (contexts) studyContent = contexts.map((c: { file_name: string; content: string }) => `FILE: ${c.file_name}\n${c.content}`).join("\n\n").substring(0, MAX_CONTEXT_CHARS);
      }

      if (!studyContent) throw new Error("Contenuto vuoto. Caricamento fallito?");

      // Prompt per la generazione della lezione
      const prompt = `Sei un tutor universitario esperto. Crea una lezione basata ESCLUSIVAMENTE sul materiale fornito.

      OBIETTIVO: Creare una lezione chiara, densa di contenuto ma facile da leggere.
      
      TITOLO LEZIONE: "${lessons.title}"
      
      ISTRUZIONI SPECIFICHE:
      1. Concept: Spiega il nucleo dell'argomento in modo sintetico.
      2. Explanation: Sviluppa l'argomento in modo discorsivo (4-6 frasi), collegando i punti chiave trovati nel testo.
      3. Exercises: 
         - Crea domande che richiedano ragionamento, non solo memoria.
         - Per "short_answer", fornisci ALMENO 10 parole chiave/sinonimi accettabili.
      
      Formato JSON richiesto:
      {
        "concept": "...",
        "explanation": "...",
        "example": "...",
        "exercises": [
           { "type": "multiple_choice", "question": "...", "options": ["..."], "correct_index": 0 },
           { "type": "short_answer", "question": "...", "expected_keywords": ["keyword1", "keyword2", "sinonimo", "variante"] }
        ]
      }

      MATERIALE DI STUDIO:
      ${studyContent}`;

      // Chiamata AI
      const aiResponse = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${PERPLEXITY_API_KEY}` },
        body: JSON.stringify({
          model: "sonar",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1
        }),
      });

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "{}";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const lessonData = JSON.parse(jsonMatch ? jsonMatch[0] : content);

      // Salvataggio
      await supabase.from("mini_lessons").update({
        concept: lessonData.concept,
        explanation: lessonData.explanation,
        example: lessonData.example,
        exercises: lessonData.exercises,
        is_generated: true,
      }).eq("id", lessons.id);

      const { data: updated } = await supabase.from("mini_lessons").select("*").eq("id", lessons.id).single();
      return successResponse({ success: true, lesson: updated });
    }

    // -----------------------------------------------------------------------
    // AZIONE 2: GENERA L'ELENCO DEI TITOLI (IL PIANO DI STUDIO)
    // -----------------------------------------------------------------------
    
    // Recupera contesto (singolo o tutti)
    let combinedContent = "";
    if (contextId) {
       const { data: ctx } = await supabase.from("study_contexts").select("content, file_name").eq("id", contextId).single();
       if (ctx) combinedContent = `FILE: ${ctx.file_name}\n${ctx.content}`;
    } else {
       const { data: ctxs } = await supabase.from("study_contexts").select("content, file_name").eq("user_id", userId);
       if (ctxs) combinedContent = ctxs.map((c: { file_name: string; content: string }) => `FILE: ${c.file_name}\n${c.content}`).join("\n\n");
    }

    combinedContent = combinedContent.substring(0, MAX_CONTEXT_CHARS);

    const titlesPrompt = `Analizza il testo fornito e crea un piano di studi strutturato.
    
    IMPORTANTE:
    1. NON creare una lezione per ogni piccola definizione. RAGGRUPPA i concetti correlati.
    2. Ogni lezione deve coprire un argomento sostanzioso (es. un intero paragrafo o sottocapitolo).
    3. Segui l'ordine logico del documento (dall'inizio alla fine).
    4. Ignora indici, bibliografie o note a piè di pagina.
    
    Output richiesto: Un array JSON di oggetti "title".
    Esempio: [{"title": "Introduzione e contesto storico"}, {"title": "I principi fondamentali della dinamica"}]
    
    TESTO DA ANALIZZARE:
    ${combinedContent}`;

    const aiResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${PERPLEXITY_API_KEY}` },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: titlesPrompt }],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const titles = JSON.parse(jsonMatch ? jsonMatch[0] : content);

    if (!Array.isArray(titles)) throw new Error("Formato titoli non valido");

    // Pulizia vecchie lezioni
    await supabase.from("mini_lessons").delete().eq("user_id", userId).eq("context_id", contextId);

    // Inserimento nuovi titoli
    const lessonsToInsert = titles.map((t: { title: string }, i: number) => ({
      user_id: userId,
      context_id: contextId,
      title: t.title,
      lesson_order: i,
      is_generated: false
    }));

    await supabase.from("mini_lessons").insert(lessonsToInsert);

    // Genera subito la prima lezione
    const firstLessonResponse = await fetch(`${supabaseUrl}/functions/v1/generate-lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({ userId, action: "generateLesson", lessonIndex: 0, contextId }),
    });
    
    const firstLessonData = await firstLessonResponse.json();

    return successResponse({ 
      success: true, 
      lessonsCount: titles.length, 
      firstLesson: firstLessonData.lesson, 
      titles: titles.map((t: { title: string }) => t.title) 
    });

  } catch (error) {
    console.error("Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Errore sconosciuto");
  }
});
