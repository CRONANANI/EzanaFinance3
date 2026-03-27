-- Onboarding progress tracking: onboarding_step flag
-- Tracks which step of onboarding the user has completed
-- Allows users to resume onboarding without re-entering data
-- Safe to re-run

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_step'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_step INTEGER DEFAULT 0;
    RAISE NOTICE 'Added onboarding_step column to profiles table';
  END IF;
END $$;
