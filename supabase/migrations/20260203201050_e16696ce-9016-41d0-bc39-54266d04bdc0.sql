-- Drop existing RLS policies and create new ones using auth.uid()

-- study_contexts table
DROP POLICY IF EXISTS "Users can view their own study contexts" ON public.study_contexts;
DROP POLICY IF EXISTS "Users can insert their own study contexts" ON public.study_contexts;
DROP POLICY IF EXISTS "Users can delete their own study contexts" ON public.study_contexts;

CREATE POLICY "Users can view their own study contexts"
ON public.study_contexts FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own study contexts"
ON public.study_contexts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own study contexts"
ON public.study_contexts FOR DELETE
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own study contexts"
ON public.study_contexts FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text);

-- study_events table
DROP POLICY IF EXISTS "Users can view their own study events" ON public.study_events;
DROP POLICY IF EXISTS "Users can insert their own study events" ON public.study_events;
DROP POLICY IF EXISTS "Users can update their own study events" ON public.study_events;
DROP POLICY IF EXISTS "Users can delete their own study events" ON public.study_events;

CREATE POLICY "Users can view their own study events"
ON public.study_events FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own study events"
ON public.study_events FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own study events"
ON public.study_events FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own study events"
ON public.study_events FOR DELETE
TO authenticated
USING (user_id = auth.uid()::text);

-- mini_lessons table
DROP POLICY IF EXISTS "Users can view their own mini lessons" ON public.mini_lessons;
DROP POLICY IF EXISTS "Users can insert their own mini lessons" ON public.mini_lessons;
DROP POLICY IF EXISTS "Users can update their own mini lessons" ON public.mini_lessons;
DROP POLICY IF EXISTS "Users can delete their own mini lessons" ON public.mini_lessons;

CREATE POLICY "Users can view their own mini lessons"
ON public.mini_lessons FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own mini lessons"
ON public.mini_lessons FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own mini lessons"
ON public.mini_lessons FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own mini lessons"
ON public.mini_lessons FOR DELETE
TO authenticated
USING (user_id = auth.uid()::text);

-- lesson_progress table
DROP POLICY IF EXISTS "Users can view their own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can upsert their own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can update their own lesson progress" ON public.lesson_progress;

CREATE POLICY "Users can view their own lesson progress"
ON public.lesson_progress FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own lesson progress"
ON public.lesson_progress FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own lesson progress"
ON public.lesson_progress FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own lesson progress"
ON public.lesson_progress FOR DELETE
TO authenticated
USING (user_id = auth.uid()::text);