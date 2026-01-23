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
    const { userId, action, lessonIndex } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generate lessons action: ${action || 'initial'} for user: ${userId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all study contexts for the user
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

    // Combine all content
    const combinedContent = contexts
      .map(c => `--- ${c.file_name} ---\n${c.content}`)
      .join("\n\n")
      .substring(0, 50000); // Increased context size

    console.log(`Combined content length: ${combinedContent.length}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // ACTION: Generate single lesson with exercises
    if (action === "generateLesson" && lessonIndex !== undefined) {
      // Get the lesson to generate
      const { data: lessons } = await supabase
        .from("mini_lessons")
        .select("*")
        .eq("user_id", userId)
        .eq("lesson_order", lessonIndex)
        .single();

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

      const lessonTitle = lessons.title;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Sei un tutor esperto che crea mini-lezioni educative stile Duolingo. Ogni mini-lezione deve:
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
}`
            },
            {
              role: "user",
              content: `Contenuto di studio:\n\n${combinedContent}\n\n---\n\nCrea la mini-lezione completa per: "${lessonTitle}"`
            },
          ],
          temperature: 0.7,
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Troppe richieste. Riprova tra qualche secondo." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: "Crediti AI esauriti." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await aiResponse.text();
        console.error("AI error:", errorText);
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

    // DEFAULT ACTION: Generate lesson titles/structure
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Sei un esperto di didattica che analizza contenuti educativi e li scompone in un percorso di apprendimento strutturato stile Duolingo.

IMPORTANTE: Rispondi SOLO con un array JSON valido, senza markdown, senza codice, senza testo aggiuntivo.

Analizza il contenuto fornito e:
1. Identifica TUTTI i concetti distinti presenti
2. Ordina i concetti in modo logico (dal più semplice al più complesso, rispettando le dipendenze)
3. Crea un titolo breve e chiaro per ogni mini-lezione (max 6 parole)

Crea MOLTE mini-lezioni (almeno 8-15, dipende dalla complessità del contenuto). Ogni concetto = 1 mini-lezione.
NON raggruppare più concetti insieme. NON creare riassunti.

Formato richiesto (array di oggetti):
[{"title": "Introduzione a X"}, {"title": "Come funziona Y"}, ...]`
          },
          {
            role: "user",
            content: `Analizza questo contenuto e crea l'elenco completo delle mini-lezioni:\n\n${combinedContent}`
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Troppe richieste. Riprova tra qualche secondo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crediti AI esauriti." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI error:", errorText);
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

    // Delete existing lessons for this user
    await supabase
      .from("mini_lessons")
      .delete()
      .eq("user_id", userId);

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
