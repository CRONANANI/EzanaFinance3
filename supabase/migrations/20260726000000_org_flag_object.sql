-- ═══════════════════════════════════════════════════════════════════
-- Org Position Flags — turn a flag from a chat message into a tracked,
-- consequential object with a resolution loop and outcome scoring.
--
-- Additive only. Existing rows keep working: the status CHECK is WIDENED
-- (not replaced with a narrower set), and the legacy 'resolved' value is
-- retained rather than rewritten. 'resolved' is left in place because it
-- is ambiguous — it could mean 'accepted' or 'acknowledged' — so we do
-- NOT lossily migrate it; new responses use the explicit new vocabulary.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Turn the flag into a tracked object ─────────────────────────
ALTER TABLE public.org_position_flags
  ADD COLUMN IF NOT EXISTS position_id           UUID,
  ADD COLUMN IF NOT EXISTS reason                TEXT,   -- COLOR-SPECIFIC; validated server-side
  ADD COLUMN IF NOT EXISTS conviction            TEXT
    CHECK (conviction IS NULL OR conviction IN ('low', 'med', 'high')),
  ADD COLUMN IF NOT EXISTS suggested_action      TEXT
    CHECK (suggested_action IS NULL OR suggested_action IN
      ('monitor', 'size_up', 'trim', 'exit', 'reunderwrite')),
  ADD COLUMN IF NOT EXISTS sector_head_member_id UUID REFERENCES public.org_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS escalated_to_ic       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS response_due_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS conflict_disclosed    BOOLEAN DEFAULT false,  -- raiser holds the ticker personally
  ADD COLUMN IF NOT EXISTS thesis_snapshot       TEXT,        -- the one-liner being challenged
  ADD COLUMN IF NOT EXISTS benchmark_symbol      TEXT,        -- e.g. XLV
  ADD COLUMN IF NOT EXISTS excess_at_flag_pp     NUMERIC;     -- excess vs benchmark at raise time

-- Widen the status enum: open | accepted | acknowledged | rejected | escalated | expired.
-- Legacy 'resolved' is kept so historical rows remain valid.
ALTER TABLE public.org_position_flags DROP CONSTRAINT IF EXISTS org_position_flags_status_check;
ALTER TABLE public.org_position_flags
  ADD CONSTRAINT org_position_flags_status_check
  CHECK (status IN ('open', 'accepted', 'acknowledged', 'rejected', 'escalated', 'expired', 'resolved'));

CREATE INDEX IF NOT EXISTS idx_org_flags_due ON public.org_position_flags(response_due_at)
  WHERE status = 'open';

-- ── 2. Evidence attached to a flag ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_flag_evidence (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id    UUID NOT NULL REFERENCES public.org_position_flags(id) ON DELETE CASCADE,
  org_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('chart', 'doc', 'news', 'model', 'link')),
  ref        TEXT NOT NULL,            -- note_id | url | storage path
  caption    TEXT,
  created_by UUID REFERENCES public.org_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_flag_evidence_flag ON public.org_flag_evidence(flag_id);

-- ── 3. The resolution loop — every response is recorded ────────────
CREATE TABLE IF NOT EXISTS public.org_flag_response (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id             UUID NOT NULL REFERENCES public.org_position_flags(id) ON DELETE CASCADE,
  org_id              UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  responder_member_id UUID NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  response            TEXT NOT NULL CHECK (response IN ('accepted', 'acknowledged', 'rejected', 'escalated')),
  rebuttal_text       TEXT,            -- REQUIRED when response='rejected' — enforced in the API
  responded_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_flag_response_flag ON public.org_flag_response(flag_id, responded_at);

-- ── 4. Outcome scoring — computed at horizon (90d) or position exit ─
CREATE TABLE IF NOT EXISTS public.org_flag_outcome (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id           UUID NOT NULL REFERENCES public.org_position_flags(id) ON DELETE CASCADE,
  org_id            UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  horizon_date      DATE NOT NULL,
  position_return   NUMERIC,
  benchmark_return  NUMERIC,
  excess            NUMERIC,
  was_correct       BOOLEAN,
  conviction_weight NUMERIC,          -- mirrors M_conv in the rating system
  score             NUMERIC,
  computed_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (flag_id)
);
CREATE INDEX IF NOT EXISTS idx_org_flag_outcome_org ON public.org_flag_outcome(org_id);

-- ── 5. RLS — flags are PUBLIC WITHIN THE ORG (deliberate), never cross-org ─
ALTER TABLE public.org_flag_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_flag_response ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_flag_outcome  ENABLE ROW LEVEL SECURITY;

-- Widen flag visibility to the whole org (in addition to the existing
-- raiser/recipient policy). Flags are a shared accountability record.
DROP POLICY IF EXISTS "org members read org flags" ON public.org_position_flags;
CREATE POLICY "org members read org flags" ON public.org_position_flags FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

-- Same org-scoped read for evidence.
DROP POLICY IF EXISTS "org members read flag evidence" ON public.org_flag_evidence;
CREATE POLICY "org members read flag evidence" ON public.org_flag_evidence FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);
DROP POLICY IF EXISTS "org members add flag evidence" ON public.org_flag_evidence;
CREATE POLICY "org members add flag evidence" ON public.org_flag_evidence FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

-- Responses: readable org-wide, writable by the responding member.
DROP POLICY IF EXISTS "org members read flag responses" ON public.org_flag_response;
CREATE POLICY "org members read flag responses" ON public.org_flag_response FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);
DROP POLICY IF EXISTS "members write own flag responses" ON public.org_flag_response;
CREATE POLICY "members write own flag responses" ON public.org_flag_response FOR INSERT WITH CHECK (
  responder_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

-- Outcomes: readable org-wide; written by the service-role cron (bypasses RLS).
DROP POLICY IF EXISTS "org members read flag outcomes" ON public.org_flag_outcome;
CREATE POLICY "org members read flag outcomes" ON public.org_flag_outcome FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);
