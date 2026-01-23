-- Drop existing mini_lessons table and recreate with new structure for exercises
DROP TABLE IF EXISTS public.mini_lessons;

CREATE TABLE public.mini_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  lesson_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  concept TEXT NOT NULL,
  explanation TEXT NOT NULL,
  example TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mini_lessons ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own mini lessons" 
ON public.mini_lessons 
FOR SELECT 
USING (user_id = current_setting('app.current_user'::text, true));

CREATE POLICY "Users can insert their own mini lessons" 
ON public.mini_lessons 
FOR INSERT 
WITH CHECK (user_id = current_setting('app.current_user'::text, true));

CREATE POLICY "Users can update their own mini lessons" 
ON public.mini_lessons 
FOR UPDATE 
USING (user_id = current_setting('app.current_user'::text, true));

CREATE POLICY "Users can delete their own mini lessons" 
ON public.mini_lessons 
FOR DELETE 
USING (user_id = current_setting('app.current_user'::text, true));