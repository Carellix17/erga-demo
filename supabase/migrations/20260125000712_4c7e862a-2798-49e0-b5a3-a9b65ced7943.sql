-- Add context_id column to mini_lessons to link lessons to specific files
ALTER TABLE public.mini_lessons 
ADD COLUMN context_id uuid REFERENCES public.study_contexts(id) ON DELETE CASCADE;

-- Create index for faster queries by context
CREATE INDEX idx_mini_lessons_context_id ON public.mini_lessons(context_id);

-- Update RLS policy for mini_lessons to allow deletion cascading properly
-- (already exists, no change needed)