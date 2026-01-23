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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "get") {
      // Get all lessons
      const { data: lessons, error: lessonsError } = await supabase
        .from("mini_lessons")
        .select("*")
        .eq("user_id", userId)
        .order("lesson_order", { ascending: true });

      // Get progress
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("current_lesson_index")
        .eq("user_id", userId)
        .single();

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
      // Get specific lesson
      const { data: lesson, error: lessonError } = await supabase
        .from("mini_lessons")
        .select("*")
        .eq("user_id", userId)
        .eq("lesson_order", lessonIndex)
        .single();

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
