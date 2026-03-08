import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { contextId } = body;
    const auth = await validateAuth(req, body);
    const { userId, userEmail, supabase } = auth;

    if (!contextId) return errorResponse("Missing contextId", 400);

    // Fetch study content
    const { data: ctx } = await supabase
      .from("study_contexts")
      .select("content, file_name")
      .eq("id", contextId)
      .single();

    let studyContent = ctx?.content;
    if (!studyContent) {
      const legacyUserId = userEmail && userEmail !== userId ? userEmail : null;
      if (legacyUserId) {
        const { data: legacyCtx } = await supabase
          .from("study_contexts")
          .select("content, file_name")
          .eq("id", contextId)
          .single();
        studyContent = legacyCtx?.content;
      }
    }

    if (!studyContent) return errorResponse("Nessun contenuto trovato", 400);

    const trimmed = studyContent.slice(0, 15000);

    const OPENROUTER_KEY = Deno.env.get("ERGA_DEMO_ROUTER");
    if (!OPENROUTER_KEY) throw new Error("ERGA_DEMO_ROUTER not configured");

    const prompt = `Genera 8 esercizi variegati basati ESCLUSIVAMENTE su questi materiali di studio. Usa TUTTI questi tipi di esercizio (almeno uno per tipo):

1. "multiple_choice" - Scelta multipla con 4 opzioni
2. "true_false" - Vero o Falso con options ["Vero", "Falso"]
3. "fill_blank" - Completa la frase (la risposta è una parola/frase breve)
4. "short_answer" - Risposta breve (1-2 parole)
5. "matching" - Abbinamento di coppie (pairs con left/right)
6. "ordering" - Metti in ordine (items da ordinare, correctAnswer è l'ordine giusto)

MATERIALI:
${trimmed}

Rispondi SOLO con un array JSON valido. Ogni esercizio ha questa struttura:
[
  {
    "type": "multiple_choice",
    "question": "Domanda?",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "B",
    "explanation": "Spiegazione breve"
  },
  {
    "type": "true_false",
    "question": "Affermazione da valutare",
    "options": ["Vero", "Falso"],
    "correctAnswer": "Vero",
    "explanation": "Perché è vero"
  },
  {
    "type": "fill_blank",
    "question": "La capitale dell'Italia è ___",
    "correctAnswer": "Roma",
    "explanation": "Roma è la capitale"
  },
  {
    "type": "matching",
    "question": "Abbina gli elementi:",
    "pairs": [{"left": "A", "right": "1"}, {"left": "B", "right": "2"}],
    "correctAnswer": ["A→1", "B→2"],
    "explanation": "Spiegazione"
  },
  {
    "type": "ordering",
    "question": "Metti in ordine cronologico:",
    "items": ["C", "A", "B"],
    "correctAnswer": ["A", "B", "C"],
    "explanation": "L'ordine corretto è..."
  }
]`;

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": "https://erga-demo.lovable.app",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 4096,
      }),
    });

    if (!resp.ok) throw new Error("AI error");
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON array
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (!arrayMatch) return errorResponse("Formato risposta non valido");

    try {
      const exercises = JSON.parse(arrayMatch[0]);
      if (!Array.isArray(exercises)) throw new Error("Not array");
      return successResponse({ exercises });
    } catch {
      return errorResponse("Errore nel parsing degli esercizi");
    }
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});
