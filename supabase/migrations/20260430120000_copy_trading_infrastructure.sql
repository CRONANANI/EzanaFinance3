-- ════════════════════════════════════════════════════════════════════════════
-- Copy Trading Request System
--
-- Foundation for ELO Pillar C (Social Influence). Tracks copy_requests,
-- active_copies (intent/state only — no trade replication), and
-- partner_eligibility on user_elo.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.copy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','withdrawn','expired')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT no_self_request CHECK (requester_id <> target_user_id)
);

CREATE INDEX IF NOT EXISTS idx_copy_req_target_pending
  ON public.copy_requests (target_user_id, status, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_copy_req_requester
  ON public.copy_requests (requester_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_copy_req_pair_recent
  ON public.copy_requests (requester_id, target_user_id, created_at DESC);

COMMENT ON TABLE public.copy_requests IS
  'Records that user A asked to copy user B''s portfolio. Status reflects target''s response.';

CREATE TABLE IF NOT EXISTS public.active_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copier_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.copy_requests(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stopped_at TIMESTAMPTZ,
  stopped_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  performance_pct NUMERIC,
  performance_updated_at TIMESTAMPTZ,
  CONSTRAINT no_self_copy CHECK (copier_id <> target_user_id)
);

CREATE INDEX IF NOT EXISTS idx_active_copies_target_active
  ON public.active_copies (target_user_id, is_active)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_active_copies_copier_active
  ON public.active_copies (copier_id, is_active)
  WHERE is_active = TRUE;

COMMENT ON TABLE public.active_copies IS
  'Confirmed ongoing copy relationships. Does NOT replicate trades; records social/economic relationship.';

ALTER TABLE public.user_elo
  ADD COLUMN IF NOT EXISTS lifetime_copy_requests INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partner_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS partner_eligible_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_elo.lifetime_copy_requests IS
  'Total copy_requests received (all statuses). At 100, partner_eligible may flip (API + this migration).';
COMMENT ON COLUMN public.user_elo.partner_eligible IS
  'True after 100+ lifetime copy requests received. Unlocks Apply-to-Partner; approval remains manual.';

ALTER TABLE public.copy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_copies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copy_requests readable by participants" ON public.copy_requests;
CREATE POLICY "copy_requests readable by participants"
  ON public.copy_requests
  FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR target_user_id = auth.uid());

DROP POLICY IF EXISTS "active_copies readable by participants" ON public.active_copies;
CREATE POLICY "active_copies readable by participants"
  ON public.active_copies
  FOR SELECT
  TO authenticated
  USING (copier_id = auth.uid() OR target_user_id = auth.uid());

UPDATE public.user_elo ue
SET lifetime_copy_requests = COALESCE((
  SELECT COUNT(*) FROM public.copy_requests cr
  WHERE cr.target_user_id = ue.user_id
), 0);

UPDATE public.user_elo
SET partner_eligible = TRUE,
    partner_eligible_at = COALESCE(partner_eligible_at, NOW())
WHERE lifetime_copy_requests >= 100
  AND partner_eligible = FALSE;
