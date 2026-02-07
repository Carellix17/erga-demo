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
        const { data: context } = await supabase
          .from("study_contexts")
          .select("content, file_name, processing_status")
          .eq("id", lessons.context_id)
          .eq("user_id", userId)
          .single();
        if (context?.processing_status !== "completed") {
          throw new Error("Il PDF è ancora in elaborazione. Riprova tra qualche secondo.");
        }
        if (context?.content) {
          studyContent = `FILE: ${context.file_name}\n${context.content}`.substring(0, MAX_CONTEXT_CHARS);
        }
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
       const { data: ctx } = await supabase
         .from("study_contexts")
         .select("content, file_name, processing_status")
         .eq("id", contextId)
         .eq("user_id", userId)
         .single();
       if (!ctx) throw new Error("Contesto non trovato");
       if (ctx.processing_status !== "completed") {
         throw new Error("Il PDF è ancora in elaborazione. Riprova tra qualche secondo.");
       }
       if (!ctx.content) {
         throw new Error("Nessun contenuto disponibile per questo PDF.");
       }
       combinedContent = `FILE: ${ctx.file_name}\n${ctx.content}`;
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

    // Try to extract JSON array from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("AI response is not valid JSON array:", content.substring(0, 500));
      throw new Error("L'AI non ha restituito un formato valido. Riprova.");
    }

    let parsedTitles: unknown;
    try {
      parsedTitles = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", jsonMatch[0].substring(0, 500));
      throw new Error("Errore nel parsing della risposta AI. Riprova.");
    }

    if (!Array.isArray(parsedTitles)) throw new Error("Formato titoli non valido");

    // Normalize: allow either [{title: string}] OR ["..."]
    const titles = parsedTitles
      .map((t) => {
        if (typeof t === "string") return { title: t };
        if (t && typeof t === "object" && "title" in t && typeof (t as { title?: unknown }).title === "string") {
          return { title: (t as { title: string }).title };
        }
        return null;
      })
      .filter((t): t is { title: string } => !!t && !!t.title);

    if (titles.length === 0) {
      console.error("No valid titles produced by AI. Raw:", jsonMatch[0].substring(0, 500));
      throw new Error("Non sono riuscito a creare un indice valido. Riprova.");
    }

    // Pulizia vecchie lezioni (stesso contesto)
    let deleteQuery = supabase.from("mini_lessons").delete().eq("user_id", userId);
    if (contextId) {
      deleteQuery = deleteQuery.eq("context_id", contextId);
    } else {
      // When generating from all materials, lessons are stored with NULL context_id
      deleteQuery = deleteQuery.is("context_id", null);
    }
    const { error: deleteError } = await deleteQuery;
    if (deleteError) {
      console.error("Delete old lessons error:", deleteError);
      throw new Error("Errore durante la pulizia delle vecchie lezioni");
    }

    // Inserimento nuovi titoli
    const lessonsToInsert = titles.map((t: { title: string }, i: number) => ({
      user_id: userId,
      context_id: contextId ?? null,
      title: t.title,
      lesson_order: i,
      is_generated: false,
      concept: "", // Will be filled when lesson is generated on-demand
      explanation: "" // Will be filled when lesson is generated on-demand
    }));

    const { error: insertError } = await supabase.from("mini_lessons").insert(lessonsToInsert);
    if (insertError) {
      console.error("Insert lessons error:", insertError);
      throw new Error("Errore durante il salvataggio delle lezioni");
    }

    // Nota: la generazione del contenuto delle lezioni avviene on-demand lato UI
    return successResponse({ 
      success: true, 
      lessonsCount: titles.length,
      titles: titles.map((t: { title: string }) => t.title),
    });

  } catch (error) {
    console.error("Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Errore sconosciuto");
  }
});
