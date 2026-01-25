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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "get") {
      // Get all lessons, optionally filtered by context
      let lessonsQuery = supabase
        .from("mini_lessons")
        .select("*")
        .eq("user_id", userId)
        .order("lesson_order", { ascending: true });

      if (contextId) {
        lessonsQuery = lessonsQuery.eq("context_id", contextId);
      }

      const { data: lessons, error: lessonsError } = await lessonsQuery;

      // Get progress
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("current_lesson_index")
        .eq("user_id", userId)
        .maybeSingle();

      if (lessonsError) {
        console.error("Lessons error:", lessonsError);
        throw new Error("Errore nel caricamento delle lezioni");
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          lessons: lessons || [],
          currentIndex: progress?.current_lesson_index || 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "getLesson" && lessonIndex !== undefined) {
      // Get specific lesson, optionally filtered by context
      let lessonQuery = supabase
        .from("mini_lessons")
        .select("*")
        .eq("user_id", userId)
        .eq("lesson_order", lessonIndex);

      if (contextId) {
        lessonQuery = lessonQuery.eq("context_id", contextId);
      }

      const { data: lesson, error: lessonError } = await lessonQuery.maybeSingle();

      if (lessonError) {
        console.error("Lesson error:", lessonError);
        throw new Error("Errore nel caricamento della lezione");
      }

      return new Response(
        JSON.stringify({ success: true, lesson }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "updateProgress" && lessonIndex !== undefined) {
      // Update progress
      const { error } = await supabase
        .from("lesson_progress")
        .upsert({
          user_id: userId,
          current_lesson_index: lessonIndex,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) {
        console.error("Progress error:", error);
        throw new Error("Errore nell'aggiornamento del progresso");
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "hasContent") {
      // Check if user has study content
      const { data: contexts } = await supabase
        .from("study_contexts")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      return new Response(
        JSON.stringify({ 
          success: true, 
          hasContent: contexts && contexts.length > 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "listContexts") {
      // List all contexts with lesson counts
      const { data: contexts } = await supabase
        .from("study_contexts")
        .select("id, file_name, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const { data: lessons } = await supabase
        .from("mini_lessons")
        .select("context_id")
        .eq("user_id", userId);

      const lessonCounts: Record<string, number> = {};
      if (lessons) {
        for (const l of lessons) {
          if (l.context_id) {
            lessonCounts[l.context_id] = (lessonCounts[l.context_id] || 0) + 1;
          }
        }
      }

      const contextsWithCounts = (contexts || []).map(c => ({
        ...c,
        lesson_count: lessonCounts[c.id] || 0,
      }));

      return new Response(
        JSON.stringify({ success: true, contexts: contextsWithCounts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
