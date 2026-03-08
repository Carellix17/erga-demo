import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, contextId, question, answer, history, questionNumber } = body;
    const auth = await validateAuth(req, body);
    const { userId, userEmail, supabase } = auth;

    if (!action) return errorResponse("Missing action", 400);

    // Fetch study content
    let studyContent = "";
    if (contextId) {
      const { data: ctx } = await supabase
        .from("study_contexts")
        .select("content, file_name")
        .eq("id", contextId)
        .single();
      if (ctx) {
        studyContent = ctx.content.slice(0, 12000);
      } else {
        // Try legacy
        const legacyUserId = userEmail && userEmail !== userId ? userEmail : null;
        if (legacyUserId) {
          const { data: legacyCtx } = await supabase
            .from("study_contexts")
            .select("content, file_name")
            .eq("id", contextId)
            .single();
          if (legacyCtx) studyContent = legacyCtx.content.slice(0, 12000);
        }
      }
    }

    if (!studyContent) {
      return errorResponse("Nessun contenuto di studio trovato", 400);
    }

    const OPENROUTER_KEY = Deno.env.get("ERGA_DEMO_ROUTER");
    if (!OPENROUTER_KEY) throw new Error("ERGA_DEMO_ROUTER not configured");

    const callAI = async (messages: any[], temperature = 0.7) => {
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "HTTP-Referer": "https://erga-demo.lovable.app",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          temperature,
          max_tokens: 1024,
        }),
      });
      if (!resp.ok) throw new Error("AI error");
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || "";
    };

    if (action === "ask") {
      const prompt = `Sei un professore italiano che sta interrogando uno studente. Basandoti ESCLUSIVAMENTE su questi materiali di studio, formula UNA domanda chiara e precisa per verificare la comprensione dello studente. La domanda deve essere aperta e richiedere una spiegazione.

MATERIALI:
${studyContent}

Rispondi SOLO con la domanda, nient'altro.`;

      const result = await callAI([{ role: "user", content: prompt }], 0.8);
      return successResponse({ question: result.trim() });
    }

    if (action === "topic") {
      const prompt = `Basandoti su questi materiali di studio, scegli UN argomento specifico su cui lo studente dovrà esporre le sue conoscenze. Rispondi SOLO con il nome dell'argomento (2-6 parole).

MATERIALI:
${studyContent}`;

      const result = await callAI([{ role: "user", content: prompt }], 0.9);
      return successResponse({ topic: result.trim() });
    }

    if (action === "evaluate" || action === "evaluate_free") {
      const isStructured = action === "evaluate";
      const qNum = questionNumber || 1;
      const maxQuestions = 5;

      const historyText = (history || [])
        .map((h: any) => `${h.type === "question" ? "DOMANDA" : h.type === "answer" ? "RISPOSTA" : "FEEDBACK"}: ${h.content}`)
        .join("\n");

      const prompt = isStructured
        ? `Sei un professore italiano che sta interrogando uno studente. Valuta questa risposta.

MATERIALI DI STUDIO:
${studyContent}

STORICO INTERROGAZIONE:
${historyText}

DOMANDA ATTUALE: ${question}
RISPOSTA DELLO STUDENTE: ${answer}

Rispondi in formato JSON (SOLO JSON, nessun testo prima o dopo):
{
  "feedback": "Valutazione dettagliata della risposta (2-3 frasi). Evidenzia cosa è corretto e cosa manca.",
  "score": <voto da 1 a 10>,
  ${qNum < maxQuestions ? '"nextQuestion": "La prossima domanda da fare (diversa dalle precedenti)",' : '"finished": true,'}
}`
        : `Sei un professore italiano. Lo studente ha esposto le sue conoscenze sull'argomento "${question}". Valuta la sua esposizione.

MATERIALI DI STUDIO:
${studyContent}

ESPOSIZIONE DELLO STUDENTE: ${answer}

Rispondi in formato JSON (SOLO JSON):
{
  "feedback": "Valutazione completa dell'esposizione: cosa è stato detto bene, cosa manca, suggerimenti. (4-5 frasi dettagliate)",
  "score": <voto da 1 a 10>,
  "finished": true
}`;

      const result = await callAI([{ role: "user", content: prompt }], 0.3);

      // Parse JSON from response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return errorResponse("Errore nel formato della risposta");

      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return successResponse(parsed);
      } catch {
        return errorResponse("Errore nel parsing della risposta");
      }
    }

    return errorResponse("Azione non valida", 400);
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});
