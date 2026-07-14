-- ═══════════════════════════════════════════════════════════════════════════
-- Pitch Stage Machine — STEP 1 schema (spec PART 2, translated to the org_ reality).
--
-- Table-name translation from the spec: pitches→org_pitches, desks→org_teams,
-- members→org_members, pitch_discussion→org_pitch_discussion_messages. New
-- tables keep the org_ prefix.
--
-- Stage rename + data migration (mapping CONFIRMED):
--   research_approved    → screening
--   research_in_progress → deep_dive
--   pm_review            → deep_dive   (collapses with research_in_progress)
--   committee_scheduled  → pitch_scheduled
--   committee_vote       → ic_vote
--   decision             → approved
--   idea / in_portfolio / exited       unchanged
--   (rows already decided 'rejected' move to the new 'rejected' stage)
--
-- New stages genuinely added: cross_desk_review, approved, rejected (screening,
-- deep_dive, pitch_scheduled, ic_vote replace the renamed keys).
--
-- All new RLS uses the SECURITY DEFINER helpers introduced in
-- 20260727000000_fix_org_rls_recursion.sql (auth_org_ids / auth_manager_org_ids
-- / auth_member_ids) — never the inline org_members subquery that recursed.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) Extend org_pitches (only the genuinely-missing columns) ──────────────
-- Already present: conviction_level, position_size_pct, variant_perception,
-- stage_entered_at. Missing:
ALTER TABLE public.org_pitches
  ADD COLUMN IF NOT EXISTS falsification    text,   -- the analyst's own kill condition
  ADD COLUMN IF NOT EXISTS benchmark_symbol text;   -- e.g. XLV — for relative performance
-- desk_id: reuse the existing team_id column (no new column).

-- ── 2) Stage rename + data migration ────────────────────────────────────────
-- Drop the CHECK first so old→new UPDATEs never transiently violate it.
ALTER TABLE public.org_pitches DROP CONSTRAINT IF EXISTS org_pitches_stage_check;

UPDATE public.org_pitches SET stage = 'screening'       WHERE stage = 'research_approved';
UPDATE public.org_pitches SET stage = 'deep_dive'       WHERE stage IN ('research_in_progress', 'pm_review');
UPDATE public.org_pitches SET stage = 'pitch_scheduled' WHERE stage = 'committee_scheduled';
UPDATE public.org_pitches SET stage = 'ic_vote'         WHERE stage = 'committee_vote';
UPDATE public.org_pitches SET stage = 'approved'        WHERE stage = 'decision';
-- Already-rejected pitches belong in the new terminal 'rejected' stage.
UPDATE public.org_pitches SET stage = 'rejected'        WHERE decision = 'rejected';

ALTER TABLE public.org_pitches
  ADD CONSTRAINT org_pitches_stage_check
  CHECK (stage IN (
    'idea', 'screening', 'deep_dive', 'cross_desk_review', 'pitch_scheduled',
    'ic_vote', 'approved', 'in_portfolio', 'exited', 'rejected'
  ));

-- ── 3) Extend org_pitch_discussion_messages → a typed challenge record ───────
-- parent_message_id already exists (self-FK); the spec's parent_id maps to it.
ALTER TABLE public.org_pitch_discussion_messages
  ADD COLUMN IF NOT EXISTS post_type      text NOT NULL DEFAULT 'note'
    CHECK (post_type IN ('question', 'challenge', 'evidence', 'concern', 'answer', 'note')),
  ADD COLUMN IF NOT EXISTS status         text NOT NULL DEFAULT 'na'
    CHECK (status IN ('open', 'rebutted', 'conceded', 'answered', 'na')),
  ADD COLUMN IF NOT EXISTS anchor_section text,
  ADD COLUMN IF NOT EXISTS parent_id      uuid REFERENCES public.org_pitch_discussion_messages(id);
-- The no_unresolved_challenges gate reads exactly this predicate.
CREATE INDEX IF NOT EXISTS idx_pitch_discussion_open_challenges
  ON public.org_pitch_discussion_messages(pitch_id)
  WHERE post_type = 'challenge' AND status = 'open';

-- ── 4) org_desk_config — per-desk sign-off thresholds ───────────────────────
CREATE TABLE IF NOT EXISTS public.org_desk_config (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id             uuid NOT NULL REFERENCES public.org_teams(id) ON DELETE CASCADE,
  min_senior_signoffs smallint NOT NULL DEFAULT 3 CHECK (min_senior_signoffs BETWEEN 1 AND 8),
  required_models     text[] NOT NULL DEFAULT
                        ARRAY['dcf', 'three_statement', 'comps', 'earnings_analysis'],
  created_at          timestamptz DEFAULT now(),
  UNIQUE (team_id)
);
CREATE INDEX IF NOT EXISTS idx_desk_config_org ON public.org_desk_config(org_id);

-- ── 5) org_pitch_signoff — screening sign-offs by senior analysts / PMs ──────
CREATE TABLE IF NOT EXISTS public.org_pitch_signoff (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id      uuid NOT NULL REFERENCES public.org_pitches(id) ON DELETE CASCADE,
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id     uuid NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  scope         text NOT NULL DEFAULT 'qualitative' CHECK (scope IN ('model', 'qualitative')),
  decision      text NOT NULL DEFAULT 'approve' CHECK (decision IN ('approve', 'request_changes')),
  in_desk       boolean NOT NULL DEFAULT true,   -- was the signer on the pitching desk?
  comment       text,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (pitch_id, member_id, scope)
);
CREATE INDEX IF NOT EXISTS idx_pitch_signoff_pitch ON public.org_pitch_signoff(pitch_id);

-- ── 6) org_desk_meeting — the structured deep-dive record ────────────────────
CREATE TABLE IF NOT EXISTS public.org_desk_meeting (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id      uuid NOT NULL REFERENCES public.org_pitches(id) ON DELETE CASCADE,
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  held_at       timestamptz,
  attendees     jsonb DEFAULT '[]'::jsonb,   -- member ids present
  bull_points   text,
  bear_points   text,
  decision      text CHECK (decision IN ('advance', 'more_work', 'kill')),
  notes         text,
  recorded_by   uuid REFERENCES public.org_members(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_desk_meeting_pitch ON public.org_desk_meeting(pitch_id);

-- ── 7) org_pitch_model — model / 3-statement checklist artifacts ─────────────
CREATE TABLE IF NOT EXISTS public.org_pitch_model (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id      uuid NOT NULL REFERENCES public.org_pitches(id) ON DELETE CASCADE,
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  model_type    text NOT NULL,   -- matches desk_config.required_models (dcf | three_statement | comps | earnings_analysis | ...)
  file_url      text,            -- storage path | url | note id
  version       int NOT NULL DEFAULT 1,
  complete      boolean NOT NULL DEFAULT false,
  uploaded_by   uuid REFERENCES public.org_members(id) ON DELETE SET NULL,
  reviewed_by   uuid REFERENCES public.org_members(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,     -- a model counts toward the gate only once reviewed
  created_at    timestamptz DEFAULT now(),
  UNIQUE (pitch_id, model_type)
);
CREATE INDEX IF NOT EXISTS idx_pitch_model_pitch ON public.org_pitch_model(pitch_id);

-- ── 8) org_cross_desk_approval — cross-desk PM votes on a frozen thesis ──────
CREATE TABLE IF NOT EXISTS public.org_cross_desk_approval (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id      uuid NOT NULL REFERENCES public.org_pitches(id) ON DELETE CASCADE,
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reviewer_member_id uuid NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  reviewer_team_id   uuid REFERENCES public.org_teams(id) ON DELETE SET NULL,
  decision      text NOT NULL CHECK (decision IN ('approve', 'object', 'abstain')),
  reason        text,        -- REQUIRED when decision='object' — enforced by trigger below
  created_at    timestamptz DEFAULT now(),
  UNIQUE (pitch_id, reviewer_member_id)
);
CREATE INDEX IF NOT EXISTS idx_cross_desk_pitch ON public.org_cross_desk_approval(pitch_id);

-- DB-level guard: an objection MUST carry a reason (not just an app check).
CREATE OR REPLACE FUNCTION public.enforce_cross_desk_reason()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.decision = 'object' AND (NEW.reason IS NULL OR length(btrim(NEW.reason)) < 10) THEN
    RAISE EXCEPTION 'An objection requires a written reason (min 10 chars).';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_cross_desk_reason ON public.org_cross_desk_approval;
CREATE TRIGGER trg_cross_desk_reason
  BEFORE INSERT OR UPDATE ON public.org_cross_desk_approval
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cross_desk_reason();

-- ── 9) org_pitch_stage_transition — the append-only audit log ────────────────
CREATE TABLE IF NOT EXISTS public.org_pitch_stage_transition (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id      uuid NOT NULL REFERENCES public.org_pitches(id) ON DELETE CASCADE,
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_stage    text,
  to_stage      text NOT NULL,
  actor_member_id uuid REFERENCES public.org_members(id) ON DELETE SET NULL,
  gate_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,   -- full gate results at transition time
  override      boolean NOT NULL DEFAULT false,
  override_reason text,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stage_transition_pitch
  ON public.org_pitch_stage_transition(pitch_id, created_at);

-- An override transition MUST carry a reason (enforced at the DB, not just app).
CREATE OR REPLACE FUNCTION public.enforce_override_reason()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.override = true AND (NEW.override_reason IS NULL OR length(btrim(NEW.override_reason)) < 20) THEN
    RAISE EXCEPTION 'An override requires a written reason (min 20 chars).';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_override_reason ON public.org_pitch_stage_transition;
CREATE TRIGGER trg_override_reason
  BEFORE INSERT ON public.org_pitch_stage_transition
  FOR EACH ROW EXECUTE FUNCTION public.enforce_override_reason();

-- ── 10) RLS — org-scoped via the SECURITY DEFINER helpers ────────────────────
ALTER TABLE public.org_desk_config           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_pitch_signoff         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_desk_meeting          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_pitch_model           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_cross_desk_approval   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_pitch_stage_transition ENABLE ROW LEVEL SECURITY;

-- Members read within their org; managers (or the acting member) write.
DROP POLICY IF EXISTS "members read desk config" ON public.org_desk_config;
CREATE POLICY "members read desk config" ON public.org_desk_config FOR SELECT
  USING (org_id IN (SELECT public.auth_org_ids()));
DROP POLICY IF EXISTS "managers write desk config" ON public.org_desk_config;
CREATE POLICY "managers write desk config" ON public.org_desk_config FOR ALL
  USING (org_id IN (SELECT public.auth_manager_org_ids()))
  WITH CHECK (org_id IN (SELECT public.auth_manager_org_ids()));

DROP POLICY IF EXISTS "members read signoffs" ON public.org_pitch_signoff;
CREATE POLICY "members read signoffs" ON public.org_pitch_signoff FOR SELECT
  USING (org_id IN (SELECT public.auth_org_ids()));
DROP POLICY IF EXISTS "members write own signoffs" ON public.org_pitch_signoff;
CREATE POLICY "members write own signoffs" ON public.org_pitch_signoff FOR INSERT
  WITH CHECK (member_id IN (SELECT public.auth_member_ids()));
DROP POLICY IF EXISTS "members delete own signoffs" ON public.org_pitch_signoff;
CREATE POLICY "members delete own signoffs" ON public.org_pitch_signoff FOR DELETE
  USING (member_id IN (SELECT public.auth_member_ids()));

DROP POLICY IF EXISTS "members read desk meetings" ON public.org_desk_meeting;
CREATE POLICY "members read desk meetings" ON public.org_desk_meeting FOR SELECT
  USING (org_id IN (SELECT public.auth_org_ids()));
DROP POLICY IF EXISTS "managers write desk meetings" ON public.org_desk_meeting;
CREATE POLICY "managers write desk meetings" ON public.org_desk_meeting FOR ALL
  USING (org_id IN (SELECT public.auth_manager_org_ids()))
  WITH CHECK (org_id IN (SELECT public.auth_manager_org_ids()));

DROP POLICY IF EXISTS "members read pitch models" ON public.org_pitch_model;
CREATE POLICY "members read pitch models" ON public.org_pitch_model FOR SELECT
  USING (org_id IN (SELECT public.auth_org_ids()));
DROP POLICY IF EXISTS "members write pitch models" ON public.org_pitch_model;
CREATE POLICY "members write pitch models" ON public.org_pitch_model FOR ALL
  USING (org_id IN (SELECT public.auth_org_ids()))
  WITH CHECK (org_id IN (SELECT public.auth_org_ids()));

DROP POLICY IF EXISTS "members read cross desk" ON public.org_cross_desk_approval;
CREATE POLICY "members read cross desk" ON public.org_cross_desk_approval FOR SELECT
  USING (org_id IN (SELECT public.auth_org_ids()));
DROP POLICY IF EXISTS "members write own cross desk" ON public.org_cross_desk_approval;
CREATE POLICY "members write own cross desk" ON public.org_cross_desk_approval FOR INSERT
  WITH CHECK (reviewer_member_id IN (SELECT public.auth_member_ids()));

-- Stage transitions: readable org-wide, insert by the acting member. APPEND-ONLY.
DROP POLICY IF EXISTS "members read stage transitions" ON public.org_pitch_stage_transition;
CREATE POLICY "members read stage transitions" ON public.org_pitch_stage_transition FOR SELECT
  USING (org_id IN (SELECT public.auth_org_ids()));
DROP POLICY IF EXISTS "members insert stage transitions" ON public.org_pitch_stage_transition;
CREATE POLICY "members insert stage transitions" ON public.org_pitch_stage_transition FOR INSERT
  WITH CHECK (org_id IN (SELECT public.auth_org_ids()));

-- Append-only: no UPDATE/DELETE for regular users (service role bypasses RLS).
REVOKE UPDATE, DELETE ON public.org_pitch_stage_transition FROM authenticated;

-- ── 11) Seed org_desk_config for every existing desk ────────────────────────
-- Thin desks (Energy / Industrials / Real Estate) need 2 senior sign-offs; the
-- rest need 3. Matched by team name so it works across orgs.
INSERT INTO public.org_desk_config (org_id, team_id, min_senior_signoffs)
SELECT t.org_id, t.id,
       CASE WHEN t.name ILIKE '%energy%' OR t.name ILIKE '%industrial%' OR t.name ILIKE '%real estate%'
            THEN 2 ELSE 3 END
FROM public.org_teams t
ON CONFLICT (team_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
