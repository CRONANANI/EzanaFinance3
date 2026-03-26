-- Tutorial walkthrough tracking: has_seen_tutorial flag
-- Tracks whether user has completed the welcome tour
-- Safe to re-run

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'has_seen_tutorial'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN has_seen_tutorial BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added has_seen_tutorial column to profiles table';
  END IF;
END $$;
