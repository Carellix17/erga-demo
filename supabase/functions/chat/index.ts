import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages } = body;

    // Validate authentication and get userId
    const auth = await validateAuth(req, body);
    const { userId, userEmail, supabase } = auth;

    if (!messages) {
      return errorResponse("Missing messages", 400);
    }

    console.log(`Chat request for user: ${userId} (authenticated: ${auth.isAuthenticated})`);

    // Fetch study contexts
    const { data: contexts } = await supabase
      .from("study_contexts")
      .select("content, file_name")
      .eq("user_id", userId);
    const legacyUserId = userEmail && userEmail !== userId ? userEmail : null;
    const { data: legacyContexts } = legacyUserId
      ? await supabase
          .from("study_contexts")
          .select("content, file_name")
          .eq("user_id", legacyUserId)
      : { data: null };

    // Fetch study events
    const { data: events } = await supabase
      .from("study_events")
      .select("*")
      .eq("user_id", userId)
      .order("event_date", { ascending: true });

    const mergedContexts = [...(contexts || []), ...(legacyContexts || [])];

    if (mergedContexts.length === 0) {
      return new Response(
        JSON.stringify({ 
          response: "Non ho ancora accesso a nessun materiale di studio. Per poterti aiutare, carica prima dei PDF con i tuoi appunti o dispense usando il pulsante in alto a destra." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Prompt size management (Groq has strict TPM/context limits) ---
    const MAX_STUDY_CHARS = 8000;
    const MAX_EVENTS_CHARS = 1500;
    const MAX_MESSAGE_CHARS = 1500;
    const MAX_HISTORY_MESSAGES = 12;

    const trimTo = (s: string, max: number) => (s.length > max ? s.slice(0, max) + "\n…" : s);

    // Build context (trim aggressively to avoid 413 / TPM issues)
    const studyContent = trimTo(
      mergedContexts
        .map((c: { file_name: string; content: string }) => `--- ${c.file_name} ---\n${c.content}`)
        .join("\n\n"),
      MAX_STUDY_CHARS
    );

    const eventsTextRaw = events && events.length > 0
      ? "Eventi programmati:\n" + events.map((e: { event_type: string; title: string; subject: string; event_date: string }) =>
          `- ${e.event_type === 'test' ? 'Verifica' : e.event_type === 'assignment' ? 'Compito' : 'Studio'}: ${e.title} (${e.subject}) - ${e.event_date}`
        ).join("\n")
      : "Nessun evento programmato nel diario.";
    const eventsText = trimTo(eventsTextRaw, MAX_EVENTS_CHARS);

    const systemPrompt = `Sei un tutor di studio personale. Rispondi SOLO basandoti sui contenuti di studio forniti e sul diario dello studente.

REGOLE IMPORTANTI:
1. Usa ESCLUSIVAMENTE le informazioni dai materiali di studio forniti
2. Se una domanda non può essere risposta con i materiali disponibili, dillo chiaramente e suggerisci di caricare altri contenuti
3. Sii chiaro, conciso e incoraggiante
4. Quando possibile, fai riferimento al diario dello studente per contestualizzare le risposte
5. Usa esempi pratici tratti dai materiali

MATERIALI DI STUDIO DISPONIBILI:
${studyContent}

DIARIO DELLO STUDENTE:
${eventsText}`;

    // Call Perplexity Sonar API
    const PERPLEXITY_API_KEY = Deno.env.get("ERGA_DEMO_PERPLEXITY_KEY");
    if (!PERPLEXITY_API_KEY) {
      throw new Error("ERGA_DEMO_PERPLEXITY_KEY is not configured");
    }

    // Build conversation for Perplexity format
    // Keep only last N messages and trim each message length.
    const trimmedHistory = (Array.isArray(messages) ? messages : [])
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m: { role: string; content: string }) => ({
        role: m.role,
        content: trimTo(String(m.content ?? ""), MAX_MESSAGE_CHARS),
      }));

    const perplexityMessages = [
      { role: "system", content: systemPrompt },
      ...trimmedHistory,
    ];

    console.log("Calling Perplexity API with model sonar");

    const aiResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: perplexityMessages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Perplexity response status:", aiResponse.status);
      console.error("Perplexity API error:", errorText);
      if (aiResponse.status === 413) {
        return errorResponse("Richiesta troppo grande. Prova a fare una domanda più specifica o carica meno materiale alla volta.", 413);
      }
      if (aiResponse.status === 429) {
        return errorResponse("Troppe richieste. Riprova tra qualche secondo.", 429);
      }
      throw new Error("Errore nella risposta Perplexity");
    }

    // Stream Groq response (already OpenAI-compatible SSE format)
    const reader = aiResponse.body?.getReader();
    if (!reader) throw new Error("No response body");

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transformStream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;
              
              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed.choices?.[0]?.delta?.content;
                if (text) {
                  const chunk = {
                    choices: [{ delta: { content: text } }],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      },
    });

    return new Response(transformStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});
