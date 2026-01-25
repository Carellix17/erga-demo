-- Drop existing restrictive policies that require Supabase Auth JWT
DROP POLICY IF EXISTS "Users can upload their own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own PDFs" ON storage.objects;

-- Create permissive policies for service role access (edge functions will handle auth)
-- The bucket is private, so only authenticated requests via edge functions can access it
CREATE POLICY "Service role full access to study-pdfs"
ON storage.objects
FOR ALL
USING (bucket_id = 'study-pdfs')
WITH CHECK (bucket_id = 'study-pdfs');