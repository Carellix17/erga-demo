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
      const { institute_type, subject_levels, first_name, last_name, nickname, age, school, avatar_url } = body;

      const validInstitutes = ["liceo_scientifico", "liceo_classico", "liceo_linguistico", "istituto_tecnico"];
      if (institute_type && !validInstitutes.includes(institute_type)) {
        return errorResponse("Tipo di istituto non valido", 400);
      }

      if (subject_levels && (typeof subject_levels !== "object" || subject_levels === null)) {
        return errorResponse("Livelli materie non validi", 400);
      }

      if (subject_levels) {
        for (const [, level] of Object.entries(subject_levels)) {
          if (typeof level !== "number" || level < 2 || level > 10 || !Number.isInteger(level)) {
            return errorResponse("I livelli devono essere numeri interi tra 2 e 10", 400);
          }
        }
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (institute_type) updateData.institute_type = institute_type;
      if (subject_levels) updateData.subject_levels = subject_levels;
      if (first_name !== undefined) updateData.first_name = String(first_name).slice(0, 50);
      if (last_name !== undefined) updateData.last_name = String(last_name).slice(0, 50);
      if (nickname !== undefined) updateData.nickname = String(nickname).slice(0, 30);
      if (age !== undefined) updateData.age = typeof age === "number" ? age : null;
      if (school !== undefined) updateData.school = String(school).slice(0, 100);
      if (avatar_url !== undefined) updateData.avatar_url = String(avatar_url).slice(0, 500);

      const { data: existing } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await supabase.from("user_profiles").update(updateData).eq("user_id", userId);
      } else {
        await supabase.from("user_profiles").insert({
          user_id: userId,
          institute_type: institute_type || "liceo_scientifico",
          subject_levels: subject_levels || {},
          ...updateData,
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
