import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages } = body;

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
      ? await supabase.from("study_contexts").select("content, file_name").eq("user_id", legacyUserId)
      : { data: null };

    // Fetch study events
    const { data: events } = await supabase
      .from("study_events")
      .select("*")
      .eq("user_id", userId)
      .order("event_date", { ascending: true });

    // Fetch user profile
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("institute_type, subject_levels, nickname, first_name")
      .eq("user_id", userId)
      .maybeSingle();

    const mergedContexts = [...(contexts || []), ...(legacyContexts || [])];

    if (mergedContexts.length === 0) {
      return new Response(
        JSON.stringify({ response: "Non ho ancora accesso a nessun materiale di studio. Per poterti aiutare, carica prima dei PDF con i tuoi appunti o dispense usando il pulsante in alto a destra." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MAX_STUDY_CHARS = 12000;
    const MAX_EVENTS_CHARS = 1500;
    const MAX_MESSAGE_CHARS = 2000;
    const MAX_HISTORY_MESSAGES = 14;

    const trimTo = (s: string, max: number) => (s.length > max ? s.slice(0, max) + "\n…" : s);

    const studyContent = trimTo(
      mergedContexts.map((c: { file_name: string; content: string }) => `--- ${c.file_name} ---\n${c.content}`).join("\n\n"),
      MAX_STUDY_CHARS
    );

    const eventsTextRaw = events && events.length > 0
      ? "Eventi programmati:\n" + events.map((e: { event_type: string; title: string; subject: string; event_date: string }) =>
          `- ${e.event_type === 'test' ? 'Verifica' : e.event_type === 'assignment' ? 'Compito' : 'Studio'}: ${e.title} (${e.subject}) - ${e.event_date}`
        ).join("\n")
      : "Nessun evento programmato nel diario.";
    const eventsText = trimTo(eventsTextRaw, MAX_EVENTS_CHARS);

    const instituteMap: Record<string, string> = {
      liceo_scientifico: "Liceo Scientifico", liceo_classico: "Liceo Classico",
      liceo_linguistico: "Liceo Linguistico", istituto_tecnico: "Istituto Tecnico",
    };
    let profileText = "";
    if (userProfile) {
      const studentName = (userProfile as any).nickname || (userProfile as any).first_name || "";
      if (studentName) {
        profileText += `\nLo studente si chiama "${studentName}". Chiamalo per nome quando interagisci.`;
      }
      profileText += `\nPROFILO STUDENTE:\n- Istituto: ${instituteMap[userProfile.institute_type] || userProfile.institute_type}`;
      if (userProfile.subject_levels && typeof userProfile.subject_levels === "object") {
        const levels = userProfile.subject_levels as Record<string, number>;
        profileText += "\n- Livelli per materia: " + Object.entries(levels).map(([s, l]) => `${s}: ${l}/10`).join(", ");
      }
      profileText += "\n\nAdatta il tuo linguaggio e la difficoltà delle spiegazioni in base al tipo di istituto e ai livelli dello studente.";
    }

    const systemPrompt = `Sei un tutor di studio personale. Rispondi SOLO basandoti sui contenuti di studio forniti e sul diario dello studente.

REGOLE IMPORTANTI:
1. Usa ESCLUSIVAMENTE le informazioni dai materiali di studio forniti
2. Se una domanda non può essere risposta con i materiali disponibili, dillo chiaramente e suggerisci di caricare altri contenuti
3. Sii chiaro, conciso e incoraggiante
4. Quando possibile, fai riferimento al diario dello studente per contestualizzare le risposte
5. Usa esempi pratici tratti dai materiali
6. Se l'utente ti invia un'immagine, analizzala attentamente in relazione ai materiali di studio. Descrivi cosa vedi e collega i contenuti ai materiali disponibili.
${profileText}

MATERIALI DI STUDIO DISPONIBILI:
${studyContent}

DIARIO DELLO STUDENTE:
${eventsText}`;

    // Process messages: handle multimodal content (images)
    const trimmedHistory = (Array.isArray(messages) ? messages : [])
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m: any) => {
        // If content is an array (multimodal), pass through for vision
        if (Array.isArray(m.content)) {
          return {
            role: m.role,
            content: m.content.map((part: any) => {
              if (part.type === "text") {
                return { type: "text", text: trimTo(String(part.text ?? ""), MAX_MESSAGE_CHARS) };
              }
              if (part.type === "image_url") {
                return part; // pass image_url through
              }
              return part;
            }),
          };
        }
        return {
          role: m.role,
          content: trimTo(String(m.content ?? ""), MAX_MESSAGE_CHARS),
        };
      });

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...trimmedHistory,
    ];

    const OPENROUTER_KEY = Deno.env.get("ERGA_DEMO_ROUTER");
    if (!OPENROUTER_KEY) {
      throw new Error("ERGA_DEMO_ROUTER is not configured");
    }

    // Check if any message has image content - use vision model
    const hasImages = trimmedHistory.some((m: any) => 
      Array.isArray(m.content) && m.content.some((p: any) => p.type === "image_url")
    );

    const model = hasImages ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash";
    console.log(`Calling OpenRouter with ${model}${hasImages ? " (vision mode)" : ""}`);

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": "https://erga-demo.lovable.app",
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway response status:", aiResponse.status);
      console.error("AI Gateway error:", errorText);
      throw new Error("Errore nella risposta AI");
    }

    // Stream response
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
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
                }
              } catch { /* skip */ }
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
