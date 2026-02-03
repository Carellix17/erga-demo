import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { userId, fileName, filePath, contextId, action } = await req.json();

    // Action: process - Process an existing context record
    if (action === "process" && contextId) {
      console.log(`Processing PDF for context: ${contextId}`);
      
      // Get the context record
      const { data: context, error: fetchError } = await supabase
        .from("study_contexts")
        .select("*")
        .eq("id", contextId)
        .single();

      if (fetchError || !context) {
        console.error("Context not found:", fetchError);
        return errorResponse("Contesto non trovato", 404);
      }

      // Update status to processing
      await supabase
        .from("study_contexts")
        .update({ processing_status: "processing" })
        .eq("id", contextId);

      try {
        // Download the PDF from storage
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from("study-pdfs")
          .download(context.file_path);

        if (downloadError || !fileData) {
          throw new Error("Impossibile scaricare il file: " + downloadError?.message);
        }

        // Convert to array buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const pdfBytes = new Uint8Array(arrayBuffer);
        
        console.log(`Downloaded PDF: ${pdfBytes.length} bytes`);

        // Extract text using pdfjs-serverless
        let extractedText = "";
        
        try {
          extractedText = await extractTextWithPdfJs(pdfBytes);
          console.log(`Extracted with pdfjs: ${extractedText.length} characters`);
        } catch (pdfJsError) {
          console.error("pdfjs extraction failed, trying fallback:", pdfJsError);
          extractedText = extractTextFallback(pdfBytes);
          console.log(`Extracted with fallback: ${extractedText.length} characters`);
        }

        // Validate extracted content
        if (!extractedText || extractedText.length < 50) {
          throw new Error("Impossibile estrarre testo sufficiente dal PDF. Il file potrebbe essere un'immagine o protetto.");
        }

        // Clean the extracted text
        const cleanedText = cleanExtractedText(extractedText);
        console.log(`Cleaned text: ${cleanedText.length} characters`);

        // Update context with extracted content
        const { error: updateError } = await supabase
          .from("study_contexts")
          .update({
            content: cleanedText.substring(0, 100000),
            processing_status: "completed",
            error_message: null
          })
          .eq("id", contextId);

        if (updateError) {
          throw new Error("Errore nel salvataggio: " + updateError.message);
        }

        return successResponse({ 
          success: true, 
          contextId,
          extractedLength: cleanedText.length 
        });

      } catch (processError) {
        console.error("Processing error:", processError);
        
        // Mark as failed
        await supabase
          .from("study_contexts")
          .update({
            processing_status: "failed",
            error_message: processError instanceof Error ? processError.message : "Errore sconosciuto"
          })
          .eq("id", contextId);

        return errorResponse(processError instanceof Error ? processError.message : "Errore durante l'elaborazione");
      }
    }

    // Action: register - Register a new upload
    if (!userId || !fileName || !filePath) {
      return errorResponse("Missing required fields: userId, fileName, filePath", 400);
    }

    console.log(`Registering PDF upload: ${fileName} for user: ${userId}`);

    // Create study_contexts record with pending status
    const { data, error } = await supabase
      .from("study_contexts")
      .insert({
        user_id: userId,
        file_name: fileName,
        file_path: filePath,
        content: "",
        processing_status: "pending"
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
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
      body: JSON.stringify({ action: "process", contextId: data.id }),
    }).catch(err => console.error("Background processing failed:", err));

    return successResponse({ 
      success: true, 
      contextId: data.id,
      status: "processing"
    });

  } catch (error) {
    console.error("Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Errore sconosciuto");
  }
});

async function extractTextWithPdfJs(pdfBytes: Uint8Array): Promise<string> {
  const pdfjsModule = await import("https://esm.sh/pdfjs-serverless@0.5.1?bundle");
  const pdfjs = await pdfjsModule.resolvePDFJS();
  
  const doc = await pdfjs.getDocument({
    data: pdfBytes,
    useSystemFonts: true,
  }).promise;

  const pages: string[] = [];
  const numPages = doc.numPages;
  
  console.log(`PDF has ${numPages} pages`);

  for (let i = 1; i <= numPages; i++) {
    try {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      
      // deno-lint-ignore no-explicit-any
      const pageText = textContent.items
        .map((item: any) => {
          if (item && typeof item.str === "string") {
            return item.str;
          }
          return "";
        })
        .join(" ");
      
      if (pageText.trim()) {
        pages.push(pageText);
      }
    } catch (pageError) {
      console.error(`Error extracting page ${i}:`, pageError);
    }
  }

  return pages.join("\n\n");
}

function extractTextFallback(pdfBytes: Uint8Array): string {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let pdfString = decoder.decode(pdfBytes);
  
  if (pdfString.includes("�")) {
    const latin1Decoder = new TextDecoder("latin1");
    pdfString = latin1Decoder.decode(pdfBytes);
  }

  const extractedParts: string[] = [];

  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;

  while ((match = btEtRegex.exec(pdfString)) !== null) {
    const textBlock = match[1];

    const tjMatches = textBlock.matchAll(/\(([^)]*)\)\s*Tj/g);
    for (const tj of tjMatches) {
      const text = cleanPdfText(tj[1]);
      if (text.length > 1 && !isPdfGarbage(text)) {
        extractedParts.push(text);
      }
    }

    const tjArrayMatches = textBlock.matchAll(/\[(.*?)\]\s*TJ/gi);
    for (const tja of tjArrayMatches) {
      const parts = tja[1].matchAll(/\(([^)]*)\)/g);
      let lineText = "";
      for (const part of parts) {
        lineText += cleanPdfText(part[1]);
      }
      if (lineText.length > 1 && !isPdfGarbage(lineText)) {
        extractedParts.push(lineText);
      }
    }
  }

  const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
  while ((match = streamRegex.exec(pdfString)) !== null) {
    const streamContent = match[1];
    const readableMatches = streamContent.match(/[\x20-\x7E]{10,}/g) || [];
    for (const readable of readableMatches) {
      if (!isPdfGarbage(readable) && readable.length > 10) {
        extractedParts.push(readable);
      }
    }
  }

  return cleanExtractedText(extractedParts.join(" "));
}

function isPdfGarbage(text: string): boolean {
  const garbagePatterns = [
    /^[0-9\s.]+$/,
    /obj\s*$/,
    /endobj/,
    /^stream$/,
    /^xref$/,
    /^trailer$/,
    /\/Type/,
    /\/Font/,
    /\/Page/,
    /\/Filter/,
    /\/Length/,
    /^R$/,
    /^[A-Z]{1,3}\d{0,3}$/,
    /\\x[0-9a-fA-F]{2}/,
    /^\s*[<>]+\s*$/,
    /^[0-9a-fA-F]{20,}$/,
  ];

  for (const pattern of garbagePatterns) {
    if (pattern.test(text.trim())) {
      return true;
    }
  }

  const letters = text.match(/[a-zA-ZàèéìòùÀÈÉÌÒÙ]/g) || [];
  if (text.length > 5 && letters.length / text.length < 0.3) {
    return true;
  }

  return false;
}

function cleanPdfText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s[a-zA-Z]\s/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, " ")
    .trim();
}
