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
    const { userId, messages } = await req.json();

    if (!userId || !messages) {
      return new Response(
        JSON.stringify({ error: "Missing userId or messages" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Chat request for user: ${userId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch study contexts
    const { data: contexts } = await supabase
      .from("study_contexts")
      .select("content, file_name")
      .eq("user_id", userId);

    // Fetch study events
    const { data: events } = await supabase
      .from("study_events")
      .select("*")
      .eq("user_id", userId)
      .order("event_date", { ascending: true });

    if (!contexts || contexts.length === 0) {
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
      contexts
        .map((c) => `--- ${c.file_name} ---\n${c.content}`)
        .join("\n\n"),
      MAX_STUDY_CHARS
    );

    const eventsTextRaw = events && events.length > 0
      ? "Eventi programmati:\n" + events.map(e =>
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

    // Call Groq API
    const GROQ_API_KEY = Deno.env.get("ERGA_DEMO_GROQ_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("ERGA_DEMO_GROQ_KEY is not configured");
    }

    // Build conversation for OpenAI/Groq format
    // Keep only last N messages and trim each message length.
    const trimmedHistory = (Array.isArray(messages) ? messages : [])
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m: { role: string; content: string }) => ({
        role: m.role,
        content: trimTo(String(m.content ?? ""), MAX_MESSAGE_CHARS),
      }));

    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...trimmedHistory,
    ];

    console.log("Calling Groq API with model llama-3.3-70b-versatile");

    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Groq response status:", aiResponse.status);
      console.error("Groq API error:", errorText);
      if (aiResponse.status === 413) {
        return new Response(
          JSON.stringify({
            error: "Richiesta troppo grande per Groq. Prova a fare una domanda più specifica o carica meno materiale alla volta.",
          }),
          { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Troppe richieste. Riprova tra qualche secondo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Errore nella risposta Groq");
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
