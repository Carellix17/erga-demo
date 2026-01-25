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
    const { userId, contextId, action } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // List all contexts for user
    if (action === "list") {
      const { data: contexts, error } = await supabase
        .from("study_contexts")
        .select("id, file_name, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching contexts:", error);
        return new Response(
          JSON.stringify({ error: "Errore nel recupero dei file" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get lesson counts per context
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

    // Delete a specific context
    if (action === "delete" && contextId) {
      console.log(`Deleting context ${contextId} for user ${userId}`);

      // First delete related lessons (cascade should handle this, but be explicit)
      const { error: lessonsError } = await supabase
        .from("mini_lessons")
        .delete()
        .eq("user_id", userId)
        .eq("context_id", contextId);

      if (lessonsError) {
        console.error("Error deleting lessons:", lessonsError);
      }

      // Delete the context
      const { error } = await supabase
        .from("study_contexts")
        .delete()
        .eq("id", contextId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error deleting context:", error);
        return new Response(
          JSON.stringify({ error: "Errore nell'eliminazione del file" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Successfully deleted context ${contextId}`);

      return new Response(
        JSON.stringify({ success: true }),
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
