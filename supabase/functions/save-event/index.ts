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
    const { userId, events, action } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "add" && events) {
      // Add new events
      const eventsToInsert = events.map((event: any) => ({
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

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete" && events) {
      // Delete events by id
      const { error } = await supabase
        .from("study_events")
        .delete()
        .in("id", events);

      if (error) {
        console.error("Delete error:", error);
        throw new Error("Errore nella cancellazione degli eventi");
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

      return new Response(
        JSON.stringify({ success: true, events: data }),
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
