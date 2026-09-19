-- Ensure every profiles column the onboarding completion path writes exists.
-- Idempotent: safe to run on any environment, any number of times.
-- Root-cause insurance for the stuck-after-question-7 loop: if any of the
-- three source migrations was never applied in an environment, the completion
-- UPDATE fails with 42703 and users bounce back to /onboarding forever.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS investor_questionnaire jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS investor_profile jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS investor_questionnaire_completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_step integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_seen_tutorial boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
