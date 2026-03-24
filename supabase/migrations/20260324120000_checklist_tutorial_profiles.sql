-- New user checklist + first-login tutorial flags on profiles
-- Safe to re-run

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS checklist_progress JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS checklist_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_seen_tutorial BOOLEAN DEFAULT false;
