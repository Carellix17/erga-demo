
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  institute_type TEXT NOT NULL DEFAULT 'liceo_scientifico',
  subject_levels JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.user_profiles FOR SELECT
USING (user_id = (auth.uid())::text);

CREATE POLICY "Users can insert their own profile"
ON public.user_profiles FOR INSERT
WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles FOR UPDATE
USING (user_id = (auth.uid())::text);

CREATE POLICY "Users can delete their own profile"
ON public.user_profiles FOR DELETE
USING (user_id = (auth.uid())::text);
