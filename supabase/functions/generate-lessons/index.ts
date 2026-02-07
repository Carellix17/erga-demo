import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

const MAX_CONTEXT_CHARS = 80000;

/**
 * Robustly extract a JSON object or array from a potentially mixed AI response.
 * Handles markdown code blocks, conversational preamble, trailing commas, and truncation.
 */
function extractJson(raw: string): unknown {
  // Strip markdown code fences
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Try direct parse first
  try { return JSON.parse(cleaned); } catch { /* continue */ }

  // Try to isolate a JSON object {...}
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch { /* continue */ }
  }

  // Try to isolate a JSON array [...]
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch { /* continue */ }
  }

  // Repair attempt: fix trailing commas, control chars, unbalanced braces
  const candidate = (objMatch?.[0] || arrMatch?.[0] || cleaned)
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\x00-\x1F\x7F]/g, "");

  let braces = 0, brackets = 0;
  let repaired = candidate;
  for (const ch of repaired) {
    if (ch === "{") braces++;
    if (ch === "}") braces--;
    if (ch === "[") brackets++;
    if (ch === "]") brackets--;
  }
  while (brackets > 0) { repaired += "]"; brackets--; }
  while (braces > 0) { repaired += "}"; braces--; }

  try { return JSON.parse(repaired); } catch { /* continue */ }

  throw new Error("Impossibile estrarre JSON dalla risposta AI. Riprova.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, lessonIndex, contextId } = body;

    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    const PERPLEXITY_API_KEY = Deno.env.get("ERGA_DEMO_PERPLEXITY_KEY");
    if (!PERPLEXITY_API_KEY) throw new Error("API Key mancante");

    console.log(`Generate lessons for user: ${userId} (authenticated: ${auth.isAuthenticated})`);

    // -----------------------------------------------------------------------
    // ACTION 1: GENERATE A SINGLE LESSON'S CONTENT
    // -----------------------------------------------------------------------
    if (action === "generateLesson" && lessonIndex !== undefined) {
      let lessonsQuery = supabase.from("mini_lessons").select("*").eq("user_id", userId).eq("lesson_order", lessonIndex);
      if (contextId) lessonsQuery = lessonsQuery.eq("context_id", contextId);

      const { data: lessons } = await lessonsQuery.maybeSingle();
      if (!lessons) throw new Error("Lezione non trovata");
      if (lessons.is_generated) return successResponse({ success: true, lesson: lessons });

      // Fetch study content
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

      const prompt = `Sei un tutor universitario esperto. Crea una lezione basata ESCLUSIVAMENTE sul materiale fornito.

IMPORTANTE: Rispondi SOLO con un oggetto JSON valido. NON aggiungere testo prima o dopo il JSON. NON usare markdown. SOLO JSON puro.

OBIETTIVO: Creare una mini-lezione breve, divisa in micro-step stile Duolingo/Mimo.
Lunghezza massima totale: 120-150 parole.

TITOLO LEZIONE: "${lessons.title}"

ISTRUZIONI SPECIFICHE:
1. Concept: 1-2 frasi massimo.
2. Explanation: suddividi in 2-4 micro-step separati da "•" (bullet), ogni bullet 1 frase corta.
   - Ogni bullet deve trattare un SOLO concetto.
   - Evita blocchi lunghi o discorsi unici.
3. Example: 1 esempio molto breve (1-2 frasi).
4. Exercises:
   - Massimo 2 esercizi.
   - Domande brevi, concrete.
   - Per "short_answer", fornisci ALMENO 6 parole chiave/sinonimi.

Formato JSON richiesto (SOLO QUESTO, nient'altro):
{
  "concept": "...",
  "explanation": "• Step 1...\\n• Step 2...\\n• Step 3...",
  "example": "...",
  "exercises": [
     { "type": "multiple_choice", "question": "...", "options": ["..."], "correct_index": 0 },
     { "type": "short_answer", "question": "...", "expected_keywords": ["keyword1", "keyword2", "sinonimo"] }
  ]
}

MATERIALE DI STUDIO:
${studyContent}`;

      const aiResponse = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${PERPLEXITY_API_KEY}` },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            { role: "system", content: "Rispondi ESCLUSIVAMENTE con JSON valido. Nessun testo aggiuntivo, nessuna spiegazione, nessun commento. Solo l'oggetto JSON richiesto." },
            { role: "user", content: prompt }
          ],
          temperature: 0.1
        }),
      });

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "{}";
      console.log("AI lesson response (first 300 chars):", content.substring(0, 300));

      const lessonData = extractJson(content) as Record<string, unknown>;

      // Save
      await supabase.from("mini_lessons").update({
        concept: lessonData.concept || "",
        explanation: lessonData.explanation || "",
        example: lessonData.example || "",
        exercises: lessonData.exercises || [],
        is_generated: true,
      }).eq("id", lessons.id);

      const { data: updated } = await supabase.from("mini_lessons").select("*").eq("id", lessons.id).single();
      return successResponse({ success: true, lesson: updated });
    }

    // -----------------------------------------------------------------------
    // ACTION 2: GENERATE LESSON TITLES (STUDY PLAN)
    // -----------------------------------------------------------------------

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

IMPORTANTE: Rispondi SOLO con un array JSON valido. NON aggiungere testo prima o dopo il JSON. NON usare markdown. SOLO JSON puro.

REGOLE:
1. NON creare una lezione per ogni piccola definizione. RAGGRUPPA i concetti correlati.
2. Ogni lezione deve coprire un argomento sostanzioso (es. un intero paragrafo o sottocapitolo).
3. Segui l'ordine logico del documento (dall'inizio alla fine).
4. Ignora indici, bibliografie o note a piè di pagina.

Output richiesto (SOLO QUESTO, nient'altro):
[{"title": "Introduzione e contesto storico"}, {"title": "I principi fondamentali della dinamica"}]

TESTO DA ANALIZZARE:
${combinedContent}`;

    const aiResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${PERPLEXITY_API_KEY}` },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "Rispondi ESCLUSIVAMENTE con JSON valido. Nessun testo aggiuntivo, nessuna spiegazione, nessun commento. Solo l'array JSON richiesto." },
          { role: "user", content: titlesPrompt }
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";
    console.log("AI titles response (first 300 chars):", content.substring(0, 300));

    const parsedTitles = extractJson(content);

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
      console.error("No valid titles produced by AI. Raw:", content.substring(0, 500));
      throw new Error("Non sono riuscito a creare un indice valido. Riprova.");
    }

    // Delete old lessons for same context
    let deleteQuery = supabase.from("mini_lessons").delete().eq("user_id", userId);
    if (contextId) {
      deleteQuery = deleteQuery.eq("context_id", contextId);
    } else {
      deleteQuery = deleteQuery.is("context_id", null);
    }
    const { error: deleteError } = await deleteQuery;
    if (deleteError) {
      console.error("Delete old lessons error:", deleteError);
      throw new Error("Errore durante la pulizia delle vecchie lezioni");
    }

    // Insert new titles
    const lessonsToInsert = titles.map((t: { title: string }, i: number) => ({
      user_id: userId,
      context_id: contextId ?? null,
      title: t.title,
      lesson_order: i,
      is_generated: false,
      concept: "",
      explanation: ""
    }));

    const { error: insertError } = await supabase.from("mini_lessons").insert(lessonsToInsert);
    if (insertError) {
      console.error("Insert lessons error:", insertError);
      throw new Error("Errore durante il salvataggio delle lezioni");
    }

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
