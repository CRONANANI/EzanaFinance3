-- 6-digit email verification (Resend) — codes table + profiles.email_verified
-- Safe to re-run (column/table guards)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
    -- Grandfather all accounts that existed when this column was added
    UPDATE public.profiles SET email_verified = TRUE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_user_id
  ON public.email_verification_codes(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_created
  ON public.email_verification_codes(user_id, created_at DESC);

ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;
