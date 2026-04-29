-- Account lock flag — set is_disabled=true to prevent any dashboard access
-- while still allowing login. The disabled_reason is shown on the locked page.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS disabled_reason TEXT,
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_is_disabled
  ON public.profiles (is_disabled)
  WHERE is_disabled = TRUE;

COMMENT ON COLUMN public.profiles.is_disabled IS
  'Account-level lock. When true, middleware redirects user to /account-locked on every page request.';
COMMENT ON COLUMN public.profiles.disabled_reason IS
  'Optional message shown on the lock screen. Visible to the locked user.';
COMMENT ON COLUMN public.profiles.disabled_at IS
  'Timestamp of when the account was locked. Set automatically via the lock helper UPDATEs.';
