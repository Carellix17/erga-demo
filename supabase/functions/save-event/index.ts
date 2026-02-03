import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { events, action } = body;

    // Validate authentication and get userId
    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    console.log(`Save event for user: ${userId} (authenticated: ${auth.isAuthenticated})`);

    if (action === "add" && events) {
      // Add new events
      const eventsToInsert = events.map((event: { subject: string; title: string; date: string; time?: string; type: string }) => ({
        user_id: userId,
        subject: event.subject,
        title: event.title,
        event_date: event.date,
        event_time: event.time || null,
        event_type: event.type,
      }));

      const { error } = await supabase
        .from("study_events")
        .insert(eventsToInsert);

      if (error) {
        console.error("Insert error:", error);
        throw new Error("Errore nel salvataggio degli eventi");
      }

      return successResponse({ success: true });
    }

    if (action === "delete" && events) {
      // Delete events by id - ensure user owns the events
      const { error } = await supabase
        .from("study_events")
        .delete()
        .eq("user_id", userId)
        .in("id", events);

      if (error) {
        console.error("Delete error:", error);
        throw new Error("Errore nella cancellazione degli eventi");
      }

      return successResponse({ success: true });
    }

    if (action === "list") {
      // List all events for user
      const { data, error } = await supabase
        .from("study_events")
        .select("*")
        .eq("user_id", userId)
        .order("event_date", { ascending: true });

      if (error) {
        console.error("List error:", error);
        throw new Error("Errore nel caricamento degli eventi");
      }

      return successResponse({ success: true, events: data });
    }

    return errorResponse("Invalid action", 400);

  } catch (error) {
    console.error("Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});
