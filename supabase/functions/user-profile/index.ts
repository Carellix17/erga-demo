import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    if (action === "get") {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      return successResponse({ profile: profile || null });
    }

    if (action === "save") {
      const { institute_type, subject_levels } = body;

      // Validate
      const validInstitutes = ["liceo_scientifico", "liceo_classico", "liceo_linguistico", "istituto_tecnico"];
      if (!validInstitutes.includes(institute_type)) {
        return errorResponse("Tipo di istituto non valido", 400);
      }

      if (typeof subject_levels !== "object" || subject_levels === null) {
        return errorResponse("Livelli materie non validi", 400);
      }

      // Validate each level is 2-10 integer
      for (const [, level] of Object.entries(subject_levels)) {
        if (typeof level !== "number" || level < 2 || level > 10 || !Number.isInteger(level)) {
          return errorResponse("I livelli devono essere numeri interi tra 2 e 10", 400);
        }
      }

      // Upsert
      const { data: existing } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_profiles")
          .update({
            institute_type,
            subject_levels,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      } else {
        await supabase
          .from("user_profiles")
          .insert({
            user_id: userId,
            institute_type,
            subject_levels,
          });
      }

      return successResponse({ success: true });
    }

    return errorResponse("Azione non valida", 400);
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Errore sconosciuto");
  }
});
