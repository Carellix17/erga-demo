import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userIdFromForm = formData.get("userId") as string | null;

    // Try to get authenticated user from JWT
    let userId = userIdFromForm;
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      if (token !== supabaseAnonKey) {
        try {
          const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
          });
          const { data, error } = await supabaseWithAuth.auth.getUser();
          if (!error && data?.user) {
            userId = data.user.id;
            console.log(`Authenticated OAuth user for upload: ${data.user.email || data.user.id}`);
          }
        } catch (authError) {
          console.log("JWT validation failed, using form userId:", authError);
        }
      }
    }

    if (!file || !userId) {
      return errorResponse("Missing required fields: file, userId", 400);
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return errorResponse("Solo file PDF sono accettati", 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(`File troppo grande. Dimensione massima: 20MB (il tuo: ${(file.size / 1024 / 1024).toFixed(1)}MB)`, 400);
    }

    console.log(`Uploading PDF: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) for user: ${userId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${userId}/${timestamp}_${sanitizedName}`;

    // Upload to storage
    const { error: uploadError } = await supabase
      .storage
      .from("study-pdfs")
      .upload(filePath, file, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return errorResponse(`Errore upload: ${uploadError.message}`);
    }

    console.log(`File uploaded to storage: ${filePath}`);

    // Create study_contexts record
    const { data: context, error: dbError } = await supabase
      .from("study_contexts")
      .insert({
        user_id: userId,
        file_name: file.name,
        file_path: filePath,
        content: "",
        processing_status: "pending"
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      // Try to clean up the uploaded file
      await supabase.storage.from("study-pdfs").remove([filePath]);
      return errorResponse("Errore nel salvataggio");
    }

    // Start async processing
    const processUrl = `${supabaseUrl}/functions/v1/extract-pdf`;
    fetch(processUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ action: "process", contextId: context.id }),
    }).catch(err => console.error("Background processing trigger failed:", err));

    console.log(`Context created: ${context.id}, processing started`);

    return successResponse({ 
      success: true, 
      contextId: context.id,
      fileName: file.name,
      fileSize: file.size,
      status: "processing"
    });

  } catch (error) {
    console.error("Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Errore sconosciuto");
  }
});
