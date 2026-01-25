import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: file, userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return new Response(
        JSON.stringify({ error: "Solo file PDF sono accettati" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `File troppo grande. Dimensione massima: 20MB (il tuo: ${(file.size / 1024 / 1024).toFixed(1)}MB)` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Uploading PDF: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) for user: ${userId}`);

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
      return new Response(
        JSON.stringify({ error: `Errore upload: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: "Errore nel salvataggio" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        contextId: context.id,
        fileName: file.name,
        fileSize: file.size,
        status: "processing"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
