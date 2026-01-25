-- Create storage bucket for PDF uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('study-pdfs', 'study-pdfs', false, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
CREATE POLICY "Users can upload their own PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'study-pdfs' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'sub'
);

CREATE POLICY "Users can view their own PDFs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'study-pdfs' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'sub'
);

CREATE POLICY "Users can delete their own PDFs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'study-pdfs' AND
  (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'sub'
);

-- Add file_path column to study_contexts to reference storage files
ALTER TABLE public.study_contexts 
ADD COLUMN IF NOT EXISTS file_path text;

-- Add processing_status column to track async processing
ALTER TABLE public.study_contexts 
ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add error_message column for failed processing
ALTER TABLE public.study_contexts 
ADD COLUMN IF NOT EXISTS error_message text;