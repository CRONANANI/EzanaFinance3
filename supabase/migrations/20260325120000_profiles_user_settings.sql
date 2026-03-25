-- Flexible per-user preferences (JSONB). Safe to re-run.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_settings JSONB DEFAULT '{}'::jsonb;
