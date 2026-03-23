-- User onboarding flag: NULL = legacy (skip), false = must complete, true = done
-- Safe to re-run

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users insert own profile'
  ) THEN
    CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;
