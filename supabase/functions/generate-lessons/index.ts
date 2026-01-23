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
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating lessons for user: ${userId}`);

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
      .substring(0, 30000); // Limit context size

    console.log(`Combined content length: ${combinedContent.length}`);

    // Call Lovable AI to generate lessons
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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
            content: `Sei un tutor esperto che crea mini-lezioni educative per studenti. Ogni mini-lezione dura circa 5 minuti e deve essere coinvolgente e chiara.

IMPORTANTE: Rispondi SOLO con un array JSON valido, senza markdown, senza codice, senza testo aggiuntivo.

Crea esattamente 5 mini-lezioni basate sul contenuto fornito. Ogni lezione deve avere:
- title: titolo breve della lezione
- concept: il concetto chiave in una frase
- explanation: spiegazione semplice e chiara (3-4 frasi)
- question: una domanda di verifica

Formato richiesto (JSON puro):
[{"title":"...","concept":"...","explanation":"...","question":"..."},...]`,
          },
          {
            role: "user",
            content: `Crea 5 mini-lezioni basate su questo contenuto di studio:\n\n${combinedContent}`,
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

    console.log("AI response:", responseContent.substring(0, 500));

    // Parse the lessons from AI response
    let lessons;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        lessons = JSON.parse(jsonMatch[0]);
      } else {
        lessons = JSON.parse(responseContent);
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      console.error("Raw response:", responseContent);
      throw new Error("Errore nel parsing delle lezioni generate");
    }

    if (!Array.isArray(lessons) || lessons.length === 0) {
      throw new Error("Formato lezioni non valido");
    }

    // Delete existing lessons for this user
    await supabase
      .from("mini_lessons")
      .delete()
      .eq("user_id", userId);

    // Insert new lessons
    const lessonsToInsert = lessons.map((lesson: any, index: number) => ({
      user_id: userId,
      title: lesson.title || `Lezione ${index + 1}`,
      concept: lesson.concept || "",
      explanation: lesson.explanation || "",
      question: lesson.question || "",
      lesson_order: index,
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        lessonsCount: lessons.length 
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
