-- Fix: Replace blanket storage policy with user-scoped one
DROP POLICY IF EXISTS "Service role full access to study-pdfs" ON storage.objects;

CREATE POLICY "Users can manage their own PDFs"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'study-pdfs' AND
  (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'study-pdfs' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);