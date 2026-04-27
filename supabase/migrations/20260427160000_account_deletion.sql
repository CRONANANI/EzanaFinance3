-- ════════════════════════════════════════════════════════════
-- Account deletion: soft-delete + reactivation window
-- ════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'deletion_scheduled_for'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN deletion_scheduled_for TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'reactivation_token'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN reactivation_token TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_deletion_scheduled_for
  ON public.profiles (deletion_scheduled_for)
  WHERE deletion_scheduled_for IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_reactivation_token
  ON public.profiles (reactivation_token)
  WHERE reactivation_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.account_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('deletion_requested', 'reactivated', 'hard_deleted')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_log_user_id
  ON public.account_deletion_log (user_id, created_at DESC);

ALTER TABLE public.account_deletion_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own deletion log" ON public.account_deletion_log;

CREATE POLICY "Users can read their own deletion log"
  ON public.account_deletion_log FOR SELECT
  USING (auth.uid() = user_id);
