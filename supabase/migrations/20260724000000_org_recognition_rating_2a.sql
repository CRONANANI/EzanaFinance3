-- ============================================================================
-- Recognition redesign (2a: Ezana Rating scorecard) — Phase 1.
-- ADDITIVE ONLY. NOT yet applied — written for review (the handoff gates Phase 1
-- on the blocker decision + migration approval).
--
-- The Ezana Rating is a NEW, per-ORG-MEMBER engine. It does NOT touch the
-- existing platform-wide, per-USER ELO (user_elo / src/lib/elo.js / ELO_TIERS /
-- the elo crons) — those stay exactly as they are (Learning Center, leaderboards,
-- profile cards depend on them). This migration only adds the org rating tables
-- and extends the existing badge table (org_recognition).
--
-- BLOCKER (Finding 1): the calibration score needs persisted conviction_level +
-- org_pitch_hindsight. Pitches are still mock-backed until the Pitch Phase-1
-- migration (47a9e51) is applied and the routes are ported. Until then, the
-- rating engine must render calibration / resolved-theses / rating as honest
-- EMPTY / PROVISIONAL states — never fabricated. This schema is ready either way.
-- ============================================================================

-- ── Per-member rating inside an org ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_member_rating (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id    uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  rating    numeric NOT NULL DEFAULT 1250,
  tier      text NOT NULL DEFAULT 'unranked',
     -- legend | cio | portfolio_mgr | senior_analyst | analyst | junior_analyst | trainee | unranked
  rated_thesis_count integer DEFAULT 0,   -- < 10 ⇒ PROVISIONAL (dimmed in the UI)
  is_provisional boolean GENERATED ALWAYS AS (rated_thesis_count < 10) STORED,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (org_id, member_id)
);

-- ── Audit trail — every rating change (history + percentiles + sparkline) ────
CREATE TABLE IF NOT EXISTS public.org_rating_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id    uuid NOT NULL,
  delta        numeric NOT NULL,
  rating_after numeric NOT NULL,
  reason       text NOT NULL,             -- thesis_resolved | decay | admin
  pitch_id     uuid,                      -- the receipt
  metadata     jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rating_tx_member ON public.org_rating_transactions(org_id, member_id, created_at);

-- ── The 6 role-weighted category scores (0–100) behind the composite ────────
CREATE TABLE IF NOT EXISTS public.org_rating_categories (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id    uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  category  text NOT NULL,
  score     numeric NOT NULL CHECK (score BETWEEN 0 AND 100),
  weight    numeric NOT NULL,
  computed_at timestamptz DEFAULT now(),
  UNIQUE (org_id, member_id, category)
);

-- ── Server-tunable role weights (org_id NULL = platform default) ────────────
CREATE TABLE IF NOT EXISTS public.org_rating_weights (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id   uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  role     text NOT NULL,                 -- analyst | quant_trader | portfolio_manager | vp
  category text NOT NULL,
  weight   numeric NOT NULL,
  UNIQUE (org_id, role, category)
);

-- Seed the platform-default role weight sets EXACTLY per the design (once).
INSERT INTO public.org_rating_weights (org_id, role, category, weight)
SELECT NULL, v.role, v.category, v.weight
FROM (VALUES
  ('analyst','calibration',22),('analyst','alpha_vs_sector',24),('analyst','research_output',18),
  ('analyst','learning',12),('analyst','task_efficiency',12),('analyst','engagement',12),
  ('quant_trader','calibration',20),('quant_trader','strategy_pnl',24),('quant_trader','execution_quality',18),
  ('quant_trader','backtest_research',14),('quant_trader','learning',12),('quant_trader','task_efficiency',12),
  ('portfolio_manager','calibration',20),('portfolio_manager','portfolio_alpha',24),('portfolio_manager','risk_management',18),
  ('portfolio_manager','allocation_discipline',14),('portfolio_manager','engagement',12),('portfolio_manager','task_efficiency',12),
  ('vp','leadership',22),('vp','team_uplift',20),('vp','calibration',16),
  ('vp','research_oversight',16),('vp','engagement',14),('vp','task_efficiency',12)
) AS v(role, category, weight)
WHERE NOT EXISTS (SELECT 1 FROM public.org_rating_weights w WHERE w.org_id IS NULL);

-- ── Extend the existing badge table (do NOT replace it) ─────────────────────
-- org_recognition already has `auto_generated` — reuse it instead of a redundant
-- `auto_awarded`. Add the award flag (gold) and the pitch receipt link.
ALTER TABLE public.org_recognition
  ADD COLUMN IF NOT EXISTS is_award boolean DEFAULT false,   -- awards render gold, distinct from badges
  ADD COLUMN IF NOT EXISTS pitch_id uuid;

-- ── RLS — org-scoped (members read own org; managers write) ─────────────────
ALTER TABLE public.org_member_rating       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_rating_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_rating_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_rating_weights      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read ratings" ON public.org_member_rating;
CREATE POLICY "members read ratings" ON public.org_member_rating FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "managers write ratings" ON public.org_member_rating;
CREATE POLICY "managers write ratings" ON public.org_member_rating FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

DROP POLICY IF EXISTS "members read rating tx" ON public.org_rating_transactions;
CREATE POLICY "members read rating tx" ON public.org_rating_transactions FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "managers write rating tx" ON public.org_rating_transactions;
CREATE POLICY "managers write rating tx" ON public.org_rating_transactions FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

DROP POLICY IF EXISTS "members read rating categories" ON public.org_rating_categories;
CREATE POLICY "members read rating categories" ON public.org_rating_categories FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "managers write rating categories" ON public.org_rating_categories;
CREATE POLICY "managers write rating categories" ON public.org_rating_categories FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- weights: everyone reads platform defaults (org_id NULL) + their org's; managers
-- write only their own org's overrides (never the platform defaults).
DROP POLICY IF EXISTS "members read rating weights" ON public.org_rating_weights;
CREATE POLICY "members read rating weights" ON public.org_rating_weights FOR SELECT USING (
  org_id IS NULL
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "managers write rating weights" ON public.org_rating_weights;
CREATE POLICY "managers write rating weights" ON public.org_rating_weights FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);
