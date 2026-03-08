import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, key, value } = body;

    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    if (action === "get") {
      if (!key) return errorResponse("Missing key", 400);

      const { data } = await supabase
        .from("user_data")
        .select("value")
        .eq("user_id", userId)
        .eq("key", key)
        .maybeSingle();

      return successResponse({ value: data?.value ?? null });
    }

    if (action === "save") {
      if (!key) return errorResponse("Missing key", 400);

      const { data: existing } = await supabase
        .from("user_data")
        .select("id")
        .eq("user_id", userId)
        .eq("key", key)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_data")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("key", key);
      } else {
        await supabase
          .from("user_data")
          .insert({ user_id: userId, key, value });
      }

      return successResponse({ success: true });
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});
