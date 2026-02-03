import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { contextId, action } = body;

    // Validate authentication and get userId
    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    console.log(`Delete context for user: ${userId} (authenticated: ${auth.isAuthenticated})`);

    // List all contexts for user
    if (action === "list") {
      const { data: contexts, error } = await supabase
        .from("study_contexts")
        .select("id, file_name, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching contexts:", error);
        return errorResponse("Errore nel recupero dei file");
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

      const contextsWithCounts = (contexts || []).map((c: { id: string; file_name: string; created_at: string }) => ({
        ...c,
        lesson_count: lessonCounts[c.id] || 0,
      }));

      return successResponse({ success: true, contexts: contextsWithCounts });
    }

    // Delete a specific context
    if (action === "delete" && contextId) {
      console.log(`Deleting context ${contextId} for user ${userId}`);

      // First delete related lessons
      const { error: lessonsError } = await supabase
        .from("mini_lessons")
        .delete()
        .eq("user_id", userId)
        .eq("context_id", contextId);

      if (lessonsError) {
        console.error("Error deleting lessons:", lessonsError);
      }

      // Delete the context - ensure user owns it
      const { error } = await supabase
        .from("study_contexts")
        .delete()
        .eq("id", contextId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error deleting context:", error);
        return errorResponse("Errore nell'eliminazione del file");
      }

      console.log(`Successfully deleted context ${contextId}`);

      return successResponse({ success: true });
    }

    return errorResponse("Invalid action", 400);

  } catch (error) {
    console.error("Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});
