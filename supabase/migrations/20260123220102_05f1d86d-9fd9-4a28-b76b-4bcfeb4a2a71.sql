-- Table for storing extracted PDF content as study context
CREATE TABLE public.study_contexts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for storing study events (tests, assignments)
CREATE TABLE public.study_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('test', 'assignment', 'study')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for storing generated mini-lessons
CREATE TABLE public.mini_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  concept TEXT NOT NULL,
  explanation TEXT NOT NULL,
  question TEXT NOT NULL,
  lesson_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for tracking lesson progress
CREATE TABLE public.lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  current_lesson_index INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.study_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mini_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_contexts
CREATE POLICY "Users can view their own study contexts"
ON public.study_contexts FOR SELECT
USING (user_id = current_setting('app.current_user', true));

CREATE POLICY "Users can insert their own study contexts"
ON public.study_contexts FOR INSERT
WITH CHECK (user_id = current_setting('app.current_user', true));

CREATE POLICY "Users can delete their own study contexts"
ON public.study_contexts FOR DELETE
USING (user_id = current_setting('app.current_user', true));

-- RLS Policies for study_events
CREATE POLICY "Users can view their own study events"
ON public.study_events FOR SELECT
USING (user_id = current_setting('app.current_user', true));

CREATE POLICY "Users can insert their own study events"
ON public.study_events FOR INSERT
WITH CHECK (user_id = current_setting('app.current_user', true));

CREATE POLICY "Users can update their own study events"
ON public.study_events FOR UPDATE
USING (user_id = current_setting('app.current_user', true));

CREATE POLICY "Users can delete their own study events"
ON public.study_events FOR DELETE
USING (user_id = current_setting('app.current_user', true));

-- RLS Policies for mini_lessons
CREATE POLICY "Users can view their own mini lessons"
ON public.mini_lessons FOR SELECT
USING (user_id = current_setting('app.current_user', true));

CREATE POLICY "Users can insert their own mini lessons"
ON public.mini_lessons FOR INSERT
WITH CHECK (user_id = current_setting('app.current_user', true));

CREATE POLICY "Users can delete their own mini lessons"
ON public.mini_lessons FOR DELETE
USING (user_id = current_setting('app.current_user', true));

-- RLS Policies for lesson_progress
CREATE POLICY "Users can view their own lesson progress"
ON public.lesson_progress FOR SELECT
USING (user_id = current_setting('app.current_user', true));

CREATE POLICY "Users can upsert their own lesson progress"
ON public.lesson_progress FOR INSERT
WITH CHECK (user_id = current_setting('app.current_user', true));

CREATE POLICY "Users can update their own lesson progress"
ON public.lesson_progress FOR UPDATE
USING (user_id = current_setting('app.current_user', true));