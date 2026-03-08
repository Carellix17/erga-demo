ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS first_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nickname text DEFAULT '',
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS school text DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT '';