
CREATE TABLE public.user_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data"
ON public.user_data FOR SELECT
TO authenticated
USING (user_id = (auth.uid())::text);

CREATE POLICY "Users can insert their own data"
ON public.user_data FOR INSERT
TO authenticated
WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY "Users can update their own data"
ON public.user_data FOR UPDATE
TO authenticated
USING (user_id = (auth.uid())::text);

CREATE POLICY "Users can delete their own data"
ON public.user_data FOR DELETE
TO authenticated
USING (user_id = (auth.uid())::text);
