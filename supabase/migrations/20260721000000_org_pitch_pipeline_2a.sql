-- ============================================================================
-- Pitch Pipeline redesign (1a Kanban / 1b Tracker / 1c IC Vote) — Phase 1.
-- ADDITIVE ONLY. NOT yet applied — written for review (the handoff gates Phase 1
-- on migration + stage-naming approval).
--
-- CORRECTION to the handoff audit: the Supabase pitch tables ALREADY EXIST with
-- RLS (created in 20260603000000_org_pitch_pipeline.sql): org_pitches,
-- org_pitch_votes, org_pitch_deliverables, org_pitch_stage_history,
-- org_pitch_hindsight, org_pitch_discussion_messages. The pipeline's *routes*
-- write to the in-memory org-pitch-store.js instead of these tables — that is
-- the real bug (data lost on cold start). Porting the routes onto these tables
-- is a CODE change (Phase 1 code). This migration only adds what the 2a design
-- needs on top: new org_pitches columns, two new stage values, a votes
-- uniqueness guard, and the two genuinely-missing tables (IC meetings,
-- per-org templates).
--
-- STAGE NAMING (Finding 3): default is option (a) — KEEP the existing internal
-- stage keys (idea / research_approved / research_in_progress / pm_review /
-- committee_scheduled / committee_vote / decision) and map them to the design's
-- labels (Idea / Screening / Deep Dive / Model Complete / Pitch Scheduled / IC
-- Vote / Approved) in the UI only. No data migration, lowest risk. This file
-- ADDS the post-approval stages 'in_portfolio' and 'exited'.
-- ============================================================================

-- ── Extend org_pitches (only the columns not already present) ───────────────
-- Already present (from 20260603): thesis_short, thesis_full, catalysts, risks,
-- target_price, current_price_at_submission, time_horizon, position_size_pct,
-- committee_meeting_at, decision, vote_*_count, archived_at. IF NOT EXISTS makes
-- any overlap a safe no-op.
ALTER TABLE public.org_pitches
  ADD COLUMN IF NOT EXISTS sector             text,
  ADD COLUMN IF NOT EXISTS variant_perception text,
  ADD COLUMN IF NOT EXISTS catalyst_date      date,
  ADD COLUMN IF NOT EXISTS pitch_price        numeric,   -- price at pitch time → 1b tracker (current_price_at_submission may also exist)
  ADD COLUMN IF NOT EXISTS valuation_method   text,      -- dcf | comps | sotp
  ADD COLUMN IF NOT EXISTS valuation_bull     numeric,
  ADD COLUMN IF NOT EXISTS valuation_base     numeric,
  ADD COLUMN IF NOT EXISTS valuation_bear     numeric,
  ADD COLUMN IF NOT EXISTS conviction_level   smallint CHECK (conviction_level BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS stage_entered_at   timestamptz DEFAULT now(),  -- → days_in_stage (DERIVED, never persist the count)
  ADD COLUMN IF NOT EXISTS archive_reason     text,       -- rejected/exited: the teaching artifact
  ADD COLUMN IF NOT EXISTS last_reaffirmed_at timestamptz,-- quarterly thesis review
  ADD COLUMN IF NOT EXISTS ic_meeting_at      timestamptz;

-- ── Widen the stage enum: + in_portfolio, exited (keep the existing 7) ───────
-- Rejection is a status/decision ('rejected'), not a stage — the archive lane
-- derives rejected/exited pitches; no 'rejected' stage is added.
ALTER TABLE public.org_pitches DROP CONSTRAINT IF EXISTS org_pitches_stage_check;
ALTER TABLE public.org_pitches
  ADD CONSTRAINT org_pitches_stage_check
  CHECK (stage IN ('idea','research_approved','research_in_progress','pm_review',
                   'committee_scheduled','committee_vote','decision',
                   'in_portfolio','exited'));

-- ── One vote per member per pitch (recorded permanently; supports upsert) ────
-- Safe if the real table is empty (the pipeline used the mock, so it should be).
CREATE UNIQUE INDEX IF NOT EXISTS uq_pitch_votes_member
  ON public.org_pitch_votes(pitch_id, voter_member_id);

-- ── NEW: IC meetings (agenda auto-assembles from Pitch-Scheduled pitches) ────
CREATE TABLE IF NOT EXISTS public.org_ic_meetings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meets_at     timestamptz,
  ballot_type  text NOT NULL DEFAULT 'open'   CHECK (ballot_type IN ('open','blind')),
  threshold    text NOT NULL DEFAULT 'simple' CHECK (threshold IN ('simple','supermajority')),
  quorum_pct   smallint DEFAULT 50 CHECK (quorum_pct BETWEEN 0 AND 100),
  status       text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_session','closed')),
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ic_meetings_org ON public.org_ic_meetings(org_id, meets_at);

-- Tie a pitch to its scheduled IC meeting (additive; committee_meeting_id may
-- already exist from 20260603 — keep this as the IC-meeting FK).
ALTER TABLE public.org_pitches
  ADD COLUMN IF NOT EXISTS ic_meeting_id uuid;
ALTER TABLE public.org_pitches DROP CONSTRAINT IF EXISTS org_pitches_ic_meeting_id_fkey;
ALTER TABLE public.org_pitches
  ADD CONSTRAINT org_pitches_ic_meeting_id_fkey
  FOREIGN KEY (ic_meeting_id) REFERENCES public.org_ic_meetings(id) ON DELETE SET NULL;

-- ── NEW: per-org pitch templates (required sections / checklist) ────────────
CREATE TABLE IF NOT EXISTS public.org_pitch_templates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name           text NOT NULL,
  required_sections jsonb DEFAULT '[]'::jsonb,   -- e.g. ["thesis","valuation","risks"]
  screening_checklist jsonb DEFAULT '[]'::jsonb, -- liquidity / mktcap floor / mandate / sector
  min_deliverables smallint DEFAULT 1,
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pitch_templates_org ON public.org_pitch_templates(org_id);

-- ── RLS on the two new tables — mirror org patterns (members read; managers write)
ALTER TABLE public.org_ic_meetings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_pitch_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read ic meetings" ON public.org_ic_meetings;
CREATE POLICY "members read ic meetings" ON public.org_ic_meetings FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);
DROP POLICY IF EXISTS "managers write ic meetings" ON public.org_ic_meetings;
CREATE POLICY "managers write ic meetings" ON public.org_ic_meetings FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

DROP POLICY IF EXISTS "members read pitch templates" ON public.org_pitch_templates;
CREATE POLICY "members read pitch templates" ON public.org_pitch_templates FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);
DROP POLICY IF EXISTS "managers write pitch templates" ON public.org_pitch_templates;
CREATE POLICY "managers write pitch templates" ON public.org_pitch_templates FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- NOTE: org_pitch_votes / _deliverables / _stage_history / _hindsight /
-- _discussion_messages already exist WITH RLS (20260603100000). This migration
-- does not redefine them. The route port (Phase 1 code) writes to them via the
-- existing policies.
