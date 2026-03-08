import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

const MAX_CONTEXT_CHARS = 80000;

function extractJson(raw: string): unknown {
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(cleaned); } catch { /* continue */ }
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch { /* continue */ } }
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch { /* continue */ } }
  const candidate = (objMatch?.[0] || arrMatch?.[0] || cleaned)
    .replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, "");
  let braces = 0, brackets = 0;
  let repaired = candidate;
  for (const ch of repaired) { if (ch === "{") braces++; if (ch === "}") braces--; if (ch === "[") brackets++; if (ch === "]") brackets--; }
  while (brackets > 0) { repaired += "]"; brackets--; }
  while (braces > 0) { repaired += "}"; braces--; }
  try { return JSON.parse(repaired); } catch { /* continue */ }
  throw new Error("Impossibile estrarre JSON dalla risposta AI. Riprova.");
}

async function callAI(messages: { role: string; content: string }[], temperature = 0.1, maxTokens = 4000): Promise<string> {
  const OPENROUTER_KEY = Deno.env.get("ERGA_DEMO_ROUTER");
  if (!OPENROUTER_KEY) throw new Error("ERGA_DEMO_ROUTER mancante");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "HTTP-Referer": "https://erga-demo.lovable.app",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter error:", response.status, errorText);
    throw new Error("Errore nella risposta AI");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
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

    // Fetch user profile for personalization
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("institute_type, subject_levels")
      .eq("user_id", userId)
      .maybeSingle();

    const instituteMap: Record<string, string> = {
      liceo_scientifico: "Liceo Scientifico", liceo_classico: "Liceo Classico",
      liceo_linguistico: "Liceo Linguistico", istituto_tecnico: "Istituto Tecnico",
    };
    let profileContext = "";
    if (userProfile) {
      profileContext = `\nLo studente frequenta un ${instituteMap[userProfile.institute_type] || userProfile.institute_type}.`;
      if (userProfile.subject_levels && typeof userProfile.subject_levels === "object") {
        const levels = userProfile.subject_levels as Record<string, number>;
        profileContext += " Livelli: " + Object.entries(levels).map(([s, l]) => `${s}: ${l}/10`).join(", ") + ".";
      }
      profileContext += "\nAdatta la difficoltà e gli esempi al livello dello studente.";
    }

    const { userEmail } = auth;
    const legacyUserId = userEmail && userEmail !== userId ? userEmail : null;

    console.log(`Generate lessons for user: ${userId} (legacy: ${legacyUserId}) (authenticated: ${auth.isAuthenticated})`);

    // ── GENERATE A SINGLE LESSON ──
    if (action === "generateLesson" && lessonIndex !== undefined) {
      let lessonsQuery = supabase.from("mini_lessons").select("*").eq("user_id", userId).eq("lesson_order", lessonIndex);
      if (contextId) lessonsQuery = lessonsQuery.eq("context_id", contextId);

      let { data: lessons } = await lessonsQuery.maybeSingle();

      // Fallback: try legacy user_id (email)
      if (!lessons && legacyUserId) {
        let legacyQuery = supabase.from("mini_lessons").select("*").eq("user_id", legacyUserId).eq("lesson_order", lessonIndex);
        if (contextId) legacyQuery = legacyQuery.eq("context_id", contextId);
        const { data: legacyLesson } = await legacyQuery.maybeSingle();
        lessons = legacyLesson;
      }

      if (!lessons) throw new Error("Lezione non trovata");
      if (lessons.is_generated) return successResponse({ success: true, lesson: lessons });

      let studyContent = "";
      if (lessons.context_id) {
        // Try with UUID first, then legacy email
        let { data: context } = await supabase.from("study_contexts").select("content, file_name, processing_status").eq("id", lessons.context_id).eq("user_id", userId).single();
        if (!context && legacyUserId) {
          const { data: legacyCtx } = await supabase.from("study_contexts").select("content, file_name, processing_status").eq("id", lessons.context_id).eq("user_id", legacyUserId).single();
          context = legacyCtx;
        }
        if (context?.processing_status !== "completed") throw new Error("Il PDF è ancora in elaborazione. Riprova tra qualche secondo.");
        if (context?.content) studyContent = `FILE: ${context.file_name}\n${context.content}`.substring(0, MAX_CONTEXT_CHARS);
      } else {
        const { data: contexts } = await supabase.from("study_contexts").select("content, file_name").eq("user_id", userId);
        const { data: legacyCtxs } = legacyUserId ? await supabase.from("study_contexts").select("content, file_name").eq("user_id", legacyUserId) : { data: null };
        const allCtxs = [...(contexts || []), ...(legacyCtxs || [])];
        if (allCtxs.length) studyContent = allCtxs.map((c: { file_name: string; content: string }) => `FILE: ${c.file_name}\n${c.content}`).join("\n\n").substring(0, MAX_CONTEXT_CHARS);
      }
      if (!studyContent) throw new Error("Contenuto vuoto. Caricamento fallito?");

      const prompt = `Sei un tutor universitario esperto. Crea una lezione basata ESCLUSIVAMENTE sul materiale fornito.
${profileContext}

IMPORTANTE: Rispondi SOLO con un oggetto JSON valido. NON aggiungere testo prima o dopo il JSON. SOLO JSON puro.

OBIETTIVO: Creare una mini-lezione modulare stile Duolingo. Ogni parte della spiegazione sarà mostrata come uno step separato.

TITOLO LEZIONE: "${lessons.title}"

ISTRUZIONI:
1. Concept: 1-2 frasi massimo che introducono l'argomento.
2. Explanation_parts: Un array di 3-5 parti. Ogni parte è un blocco autonomo con titolo e contenuto breve (2-3 frasi max per parte). Le parti devono coprire l'argomento in modo progressivo.
3. Example: 1 esempio concreto e breve (2-3 frasi).
4. Exercises: 2-3 esercizi brevi e variegati. Per "short_answer", almeno 6 keywords.

JSON richiesto:
{
  "concept": "...",
  "explanation_parts": [
    { "part_title": "Titolo parte 1", "content": "Contenuto breve della parte 1..." },
    { "part_title": "Titolo parte 2", "content": "Contenuto breve della parte 2..." },
    { "part_title": "Titolo parte 3", "content": "Contenuto breve della parte 3..." }
  ],
  "example": "...",
  "exercises": [
     { "type": "multiple_choice", "question": "...", "options": ["..."], "correct_index": 0 },
     { "type": "true_false", "statement": "...", "correct": true },
     { "type": "short_answer", "question": "...", "expected_keywords": ["k1","k2","k3","k4","k5","k6"] }
  ]
}

MATERIALE DI STUDIO:
${studyContent}`;

      const content = await callAI([
        { role: "system", content: "Rispondi ESCLUSIVAMENTE con JSON valido. Nessun testo aggiuntivo. Solo l'oggetto JSON richiesto." },
        { role: "user", content: prompt }
      ], 0.1);

      console.log("AI lesson response (first 300 chars):", content.substring(0, 300));
      const lessonData = extractJson(content) as Record<string, unknown>;

      // Build explanation from parts if available, fallback to legacy
      let explanation = lessonData.explanation || "";
      if (Array.isArray(lessonData.explanation_parts) && lessonData.explanation_parts.length > 0) {
        explanation = JSON.stringify(lessonData.explanation_parts);
      }

      await supabase.from("mini_lessons").update({
        concept: lessonData.concept || "",
        explanation,
        example: lessonData.example || "",
        exercises: lessonData.exercises || [],
        is_generated: true,
      }).eq("id", lessons.id);

      const { data: updated } = await supabase.from("mini_lessons").select("*").eq("id", lessons.id).single();
      return successResponse({ success: true, lesson: updated });
    }

    // ── GENERATE FINAL TEST ──
    if (action === "generateFinalTest") {
      let lessonsQuery = supabase.from("mini_lessons").select("title, concept").eq("user_id", userId).eq("is_generated", true).order("lesson_order");
      if (contextId) lessonsQuery = lessonsQuery.eq("context_id", contextId);

      const { data: allLessons } = await lessonsQuery;
      if (!allLessons || allLessons.length === 0) throw new Error("Nessuna lezione completata per generare il test finale.");

      const topicsSummary = allLessons.map((l: { title: string; concept: string }, i: number) => `${i + 1}. ${l.title}: ${l.concept}`).join("\n");

      let studyContent = "";
      if (contextId) {
        const { data: ctx } = await supabase.from("study_contexts").select("content, file_name").eq("id", contextId).eq("user_id", userId).single();
        if (ctx?.content) studyContent = `FILE: ${ctx.file_name}\n${ctx.content}`.substring(0, MAX_CONTEXT_CHARS);
      } else {
        const { data: ctxs } = await supabase.from("study_contexts").select("content, file_name").eq("user_id", userId);
        if (ctxs) studyContent = ctxs.map((c: { file_name: string; content: string }) => `FILE: ${c.file_name}\n${c.content}`).join("\n\n").substring(0, MAX_CONTEXT_CHARS);
      }

      const finalTestPrompt = `Sei un tutor universitario esperto. Crea un TEST FINALE che valuti la comprensione di TUTTI gli argomenti.
${profileContext}

IMPORTANTE: Rispondi SOLO con un array JSON valido. SOLO JSON puro.

ARGOMENTI:
${topicsSummary}

REGOLE:
1. Esattamente ${Math.min(allLessons.length * 2, 10)} domande.
2. Copri TUTTI gli argomenti.
3. Domande DIVERSE da quelle delle lezioni.
4. Mescola: multiple_choice, true_false, fill_blank, short_answer.
5. Per "short_answer", almeno 6 keywords.

JSON richiesto:
[
  { "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correct_index": 0 },
  { "type": "true_false", "statement": "...", "correct": true },
  { "type": "fill_blank", "sentence_with_blank": "La ___ è...", "correct_answer": "risposta" },
  { "type": "short_answer", "question": "...", "expected_keywords": ["k1","k2","k3","k4","k5","k6"] }
]

MATERIALE:
${studyContent}`;

      const raw = await callAI([
        { role: "system", content: "Rispondi ESCLUSIVAMENTE con JSON valido. Solo l'array JSON richiesto." },
        { role: "user", content: finalTestPrompt }
      ], 0.2);

      console.log("AI final test response (first 300 chars):", raw.substring(0, 300));
      const exercises = extractJson(raw);
      if (!Array.isArray(exercises)) throw new Error("Formato test finale non valido");
      return successResponse({ success: true, exercises });
    }

    // ── GENERATE LESSON TITLES (STUDY PLAN) ──
    let combinedContent = "";
    if (contextId) {
      const { data: ctx } = await supabase.from("study_contexts").select("content, file_name, processing_status").eq("id", contextId).eq("user_id", userId).single();
      if (!ctx) throw new Error("Contesto non trovato");
      if (ctx.processing_status !== "completed") throw new Error("Il PDF è ancora in elaborazione. Riprova tra qualche secondo.");
      if (!ctx.content) throw new Error("Nessun contenuto disponibile per questo PDF.");
      combinedContent = `FILE: ${ctx.file_name}\n${ctx.content}`;
    } else {
      const { data: ctxs } = await supabase.from("study_contexts").select("content, file_name").eq("user_id", userId);
      if (ctxs) combinedContent = ctxs.map((c: { file_name: string; content: string }) => `FILE: ${c.file_name}\n${c.content}`).join("\n\n");
    }
    combinedContent = combinedContent.substring(0, MAX_CONTEXT_CHARS);

    const titlesPrompt = `Analizza il testo fornito e crea un piano di studi strutturato.

IMPORTANTE: Rispondi SOLO con un array JSON valido. SOLO JSON puro.

REGOLE:
1. NON creare una lezione per ogni piccola definizione. RAGGRUPPA i concetti correlati.
2. Ogni lezione deve coprire un argomento sostanzioso.
3. Segui l'ordine logico del documento.
4. Ignora indici, bibliografie o note a piè di pagina.

Output richiesto:
[{"title": "Introduzione e contesto storico"}, {"title": "I principi fondamentali"}]

TESTO DA ANALIZZARE:
${combinedContent}`;

    const content = await callAI([
      { role: "system", content: "Rispondi ESCLUSIVAMENTE con JSON valido. Solo l'array JSON richiesto." },
      { role: "user", content: titlesPrompt }
    ], 0.1, 3000);

    console.log("AI titles response (first 300 chars):", content.substring(0, 300));
    const parsedTitles = extractJson(content);
    if (!Array.isArray(parsedTitles)) throw new Error("Formato titoli non valido");

    const titles = parsedTitles
      .map((t) => {
        if (typeof t === "string") return { title: t };
        if (t && typeof t === "object" && "title" in t && typeof (t as { title?: unknown }).title === "string") return { title: (t as { title: string }).title };
        return null;
      })
      .filter((t): t is { title: string } => !!t && !!t.title);

    if (titles.length === 0) throw new Error("Non sono riuscito a creare un indice valido. Riprova.");

    // Delete old lessons for same context
    let deleteQuery = supabase.from("mini_lessons").delete().eq("user_id", userId);
    if (contextId) { deleteQuery = deleteQuery.eq("context_id", contextId); } else { deleteQuery = deleteQuery.is("context_id", null); }
    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw new Error("Errore durante la pulizia delle vecchie lezioni");

    const lessonsToInsert = titles.map((t: { title: string }, i: number) => ({
      user_id: userId, context_id: contextId ?? null, title: t.title,
      lesson_order: i, is_generated: false, concept: "", explanation: ""
    }));

    const { error: insertError } = await supabase.from("mini_lessons").insert(lessonsToInsert);
    if (insertError) throw new Error("Errore durante il salvataggio delle lezioni");

    return successResponse({ success: true, lessonsCount: titles.length, titles: titles.map((t: { title: string }) => t.title) });

  } catch (error) {
    console.error("Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Errore sconosciuto");
  }
});
