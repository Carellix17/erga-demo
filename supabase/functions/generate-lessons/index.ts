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
    const { userId, action, lessonIndex, contextId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generate lessons action: ${action || 'initial'} for user: ${userId}, contextId: ${contextId || 'all'}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const PERPLEXITY_API_KEY = Deno.env.get("ERGA_DEMO_PERPLEXITY_KEY");
    if (!PERPLEXITY_API_KEY) {
      throw new Error("ERGA_DEMO_PERPLEXITY_KEY is not configured");
    }

    // ACTION: Generate single lesson with exercises
    if (action === "generateLesson" && lessonIndex !== undefined) {
      // Get the lesson to generate (optionally filtered by context)
      let lessonsQuery = supabase
        .from("mini_lessons")
        .select("*")
        .eq("user_id", userId)
        .eq("lesson_order", lessonIndex);
      
      if (contextId) {
        lessonsQuery = lessonsQuery.eq("context_id", contextId);
      }

      const { data: lessons } = await lessonsQuery.maybeSingle();

      if (!lessons) {
        return new Response(
          JSON.stringify({ error: "Lezione non trovata" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (lessons.is_generated) {
        return new Response(
          JSON.stringify({ success: true, lesson: lessons }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch the specific context for this lesson
      let studyContent = "";
      if (lessons.context_id) {
        const { data: context } = await supabase
          .from("study_contexts")
          .select("content, file_name")
          .eq("id", lessons.context_id)
          .single();
        
        if (context) {
          studyContent = `--- ${context.file_name} ---\n${context.content}`.substring(0, 50000);
        }
      } else {
        // Fallback: use all contexts
        const { data: contexts } = await supabase
          .from("study_contexts")
          .select("content, file_name")
          .eq("user_id", userId);
        
        if (contexts) {
          studyContent = contexts
            .map(c => `--- ${c.file_name} ---\n${c.content}`)
            .join("\n\n")
            .substring(0, 50000);
        }
      }

      if (!studyContent) {
        return new Response(
          JSON.stringify({ error: "Contenuto di studio non trovato" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const lessonTitle = lessons.title;

      const prompt = `Sei un tutor esperto che crea mini-lezioni educative stile Duolingo. Ogni mini-lezione deve:
- Durare circa 5 minuti
- Focalizzarsi su UN SOLO concetto
- Essere interattiva con molti esercizi

IMPORTANTE: Rispondi SOLO con JSON valido, senza markdown, senza codice, senza testo aggiuntivo.

Crea una mini-lezione completa per il titolo dato. La lezione DEVE includere:
1. "concept": il concetto chiave in massimo 2 frasi
2. "explanation": spiegazione semplice e chiara (3-5 frasi)
3. "example": un esempio concreto e pratico
4. "exercises": array di 5-8 esercizi variati

Tipi di esercizi disponibili (usa TUTTI i tipi, variando):
- "multiple_choice": { type, question, options: string[], correct_index: number }
- "true_false": { type, statement, correct: boolean }
- "fill_blank": { type, sentence_with_blank: string (usa ___ per il blank), correct_answer: string }
- "short_answer": { type, question, expected_keywords: string[] }

Gli esercizi devono verificare REALMENTE la comprensione, non essere banali.

Formato JSON richiesto:
{
  "concept": "...",
  "explanation": "...",
  "example": "...",
  "exercises": [...]
}

Contenuto di studio:

${studyContent}

---

Crea la mini-lezione completa per: "${lessonTitle}"`;

      console.log("Calling Perplexity API for lesson generation with sonar");

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
          max_tokens: 4096,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("Perplexity API error:", errorText);
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Troppe richieste. Riprova tra qualche secondo." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error("Errore nella generazione della lezione");
      }

      const aiData = await aiResponse.json();
      const responseContent = aiData.choices?.[0]?.message?.content;

      if (!responseContent) {
        throw new Error("Risposta AI vuota");
      }

      console.log("AI lesson response:", responseContent.substring(0, 500));

      let lessonData;
      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          lessonData = JSON.parse(jsonMatch[0]);
        } else {
          lessonData = JSON.parse(responseContent);
        }
      } catch (parseError) {
        console.error("Parse error:", parseError);
        throw new Error("Errore nel parsing della lezione");
      }

      // Update the lesson with full content
      const { error: updateError } = await supabase
        .from("mini_lessons")
        .update({
          concept: lessonData.concept || "",
          explanation: lessonData.explanation || "",
          example: lessonData.example || "",
          exercises: lessonData.exercises || [],
          is_generated: true,
        })
        .eq("id", lessons.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw new Error("Errore nel salvataggio della lezione");
      }

      // Fetch updated lesson
      const { data: updatedLesson } = await supabase
        .from("mini_lessons")
        .select("*")
        .eq("id", lessons.id)
        .single();

      return new Response(
        JSON.stringify({ success: true, lesson: updatedLesson }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: Generate lessons for a specific context (file)
    if (contextId) {
      // Fetch the specific context
      const { data: context, error: contextError } = await supabase
        .from("study_contexts")
        .select("id, content, file_name")
        .eq("id", contextId)
        .eq("user_id", userId)
        .single();

      if (contextError || !context) {
        return new Response(
          JSON.stringify({ error: "File non trovato" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const studyContent = `--- ${context.file_name} ---\n${context.content}`.substring(0, 50000);

      console.log(`Generating lessons for context ${contextId}, content length: ${studyContent.length}`);

      const titlesPrompt = `Sei un esperto di didattica che analizza contenuti educativi e li scompone in un percorso di apprendimento strutturato stile Duolingo.

IMPORTANTE: Rispondi SOLO con un array JSON valido, senza markdown, senza codice, senza testo aggiuntivo.

Analizza il contenuto fornito e:
1. Identifica TUTTI i concetti distinti presenti
2. Ordina i concetti in modo logico (dal più semplice al più complesso, rispettando le dipendenze)
3. Crea un titolo breve e chiaro per ogni mini-lezione (max 6 parole)

Crea MOLTE mini-lezioni (almeno 8-15, dipende dalla complessità del contenuto). Ogni concetto = 1 mini-lezione.
NON raggruppare più concetti insieme. NON creare riassunti.

Formato richiesto (array di oggetti):
[{"title": "Introduzione a X"}, {"title": "Come funziona Y"}, ...]

Analizza questo contenuto e crea l'elenco completo delle mini-lezioni:

${studyContent}`;

      console.log("Calling Perplexity API for titles generation with sonar");

      const aiResponse = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [{ role: "user", content: titlesPrompt }],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("Perplexity API error:", errorText);
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Troppe richieste. Riprova tra qualche secondo." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error("Errore nella generazione delle lezioni");
      }

      const aiData = await aiResponse.json();
      const responseContent = aiData.choices?.[0]?.message?.content;

      if (!responseContent) {
        throw new Error("Risposta AI vuota");
      }

      console.log("AI titles response:", responseContent.substring(0, 500));

      let lessonTitles;
      try {
        const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          lessonTitles = JSON.parse(jsonMatch[0]);
        } else {
          lessonTitles = JSON.parse(responseContent);
        }
      } catch (parseError) {
        console.error("Parse error:", parseError);
        throw new Error("Errore nel parsing dei titoli");
      }

      if (!Array.isArray(lessonTitles) || lessonTitles.length === 0) {
        throw new Error("Formato titoli non valido");
      }

      // Delete existing lessons for this context
      await supabase
        .from("mini_lessons")
        .delete()
        .eq("user_id", userId)
        .eq("context_id", contextId);

      // Insert lesson placeholders linked to this context
      const lessonsToInsert = lessonTitles.map((lesson: any, index: number) => ({
        user_id: userId,
        context_id: contextId,
        title: lesson.title || `Lezione ${index + 1}`,
        concept: "",
        explanation: "",
        example: null,
        exercises: [],
        lesson_order: index,
        is_generated: false,
      }));

      const { error: insertError } = await supabase
        .from("mini_lessons")
        .insert(lessonsToInsert);

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error("Errore nel salvataggio delle lezioni");
      }

      // Generate the first lesson
      const firstLessonResponse = await fetch(`${supabaseUrl}/functions/v1/generate-lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ userId, action: "generateLesson", lessonIndex: 0, contextId }),
      });

      const firstLessonData = await firstLessonResponse.json();

      return new Response(
        JSON.stringify({ 
          success: true, 
          contextId,
          lessonsCount: lessonTitles.length,
          firstLesson: firstLessonData.lesson,
          titles: lessonTitles.map((l: any) => l.title)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DEFAULT ACTION: Generate lessons for ALL contexts (legacy behavior)
    const { data: contexts, error: contextError } = await supabase
      .from("study_contexts")
      .select("content, file_name")
      .eq("user_id", userId);

    if (contextError || !contexts || contexts.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nessun contenuto di studio trovato. Carica dei PDF." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const combinedContent = contexts
      .map(c => `--- ${c.file_name} ---\n${c.content}`)
      .join("\n\n")
      .substring(0, 50000);

    console.log(`Combined content length: ${combinedContent.length}`);

    const titlesPrompt = `Sei un esperto di didattica che analizza contenuti educativi e li scompone in un percorso di apprendimento strutturato stile Duolingo.

IMPORTANTE: Rispondi SOLO con un array JSON valido, senza markdown, senza codice, senza testo aggiuntivo.

Analizza il contenuto fornito e:
1. Identifica TUTTI i concetti distinti presenti
2. Ordina i concetti in modo logico (dal più semplice al più complesso, rispettando le dipendenze)
3. Crea un titolo breve e chiaro per ogni mini-lezione (max 6 parole)

Crea MOLTE mini-lezioni (almeno 8-15, dipende dalla complessità del contenuto). Ogni concetto = 1 mini-lezione.
NON raggruppare più concetti insieme. NON creare riassunti.

Formato richiesto (array di oggetti):
[{"title": "Introduzione a X"}, {"title": "Come funziona Y"}, ...]

Analizza questo contenuto e crea l'elenco completo delle mini-lezioni:

${combinedContent}`;

    console.log("Calling Perplexity API for titles generation with sonar");

    const aiResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: titlesPrompt }],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Perplexity API error:", errorText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Troppe richieste. Riprova tra qualche secondo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Errore nella generazione delle lezioni");
    }

    const aiData = await aiResponse.json();
    const responseContent = aiData.choices?.[0]?.message?.content;

    if (!responseContent) {
      throw new Error("Risposta AI vuota");
    }

    console.log("AI titles response:", responseContent.substring(0, 500));

    let lessonTitles;
    try {
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        lessonTitles = JSON.parse(jsonMatch[0]);
      } else {
        lessonTitles = JSON.parse(responseContent);
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      throw new Error("Errore nel parsing dei titoli");
    }

    if (!Array.isArray(lessonTitles) || lessonTitles.length === 0) {
      throw new Error("Formato titoli non valido");
    }

    // Delete existing lessons for this user (without context_id)
    await supabase
      .from("mini_lessons")
      .delete()
      .eq("user_id", userId)
      .is("context_id", null);

    // Insert lesson placeholders (only titles, not generated yet)
    const lessonsToInsert = lessonTitles.map((lesson: any, index: number) => ({
      user_id: userId,
      title: lesson.title || `Lezione ${index + 1}`,
      concept: "",
      explanation: "",
      example: null,
      exercises: [],
      lesson_order: index,
      is_generated: false,
    }));

    const { error: insertError } = await supabase
      .from("mini_lessons")
      .insert(lessonsToInsert);

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Errore nel salvataggio delle lezioni");
    }

    // Reset progress
    await supabase
      .from("lesson_progress")
      .upsert({
        user_id: userId,
        current_lesson_index: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    // Now generate the first lesson
    const firstLessonResponse = await fetch(`${supabaseUrl}/functions/v1/generate-lessons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ userId, action: "generateLesson", lessonIndex: 0 }),
    });

    const firstLessonData = await firstLessonResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        lessonsCount: lessonTitles.length,
        firstLesson: firstLessonData.lesson,
        titles: lessonTitles.map((l: any) => l.title)
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
