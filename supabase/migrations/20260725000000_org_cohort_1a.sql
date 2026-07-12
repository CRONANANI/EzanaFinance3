-- ============================================================================
-- Cohort page (1a: member lifecycle, ATS, alumni) — Phase 1.
-- ADDITIVE ONLY. NOT yet applied — written for review (the handoff gates Phase 1
-- on migration approval).
--
-- Builds ON existing infra, not around it: the Org Chart IS org_members (no
-- separate node table — accept → create/activate an org_members row and set
-- reports_to/team_id/title/tier). Graduation extends the existing
-- /api/org/cohorts/[id]/archive flow. Onboarding tasks ARE org_assignments rows
-- (no parallel to-do system) — Tab 3 is blocked until 20260720 (assignments) is
-- applied; ship honest empty otherwise. Frozen alumni ratings come from
-- org_member_rating (20260724) — honest pending until applied. Never fabricate.
-- ============================================================================

-- ── Cohort lifecycle ────────────────────────────────────────────────────────
ALTER TABLE public.org_cohorts
  ADD COLUMN IF NOT EXISTS status             text DEFAULT 'active',
     -- recruiting | active | graduating | alumni | archived
  ADD COLUMN IF NOT EXISTS entry_term         text,
  ADD COLUMN IF NOT EXISTS expected_grad_term text,
  ADD COLUMN IF NOT EXISTS onboarding_gate    boolean DEFAULT true;  -- blocks live pitch until onboarding complete

-- ── ATS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cohort_id uuid NOT NULL REFERENCES public.org_cohorts(id) ON DELETE CASCADE,
  full_name text NOT NULL, email text,
  program text, year text,
  resume_url text, sample_pitch_url text,
  responses jsonb DEFAULT '{}'::jsonb,
  stage text NOT NULL DEFAULT 'applied'
    CHECK (stage IN ('applied','screened','interview','pitch','offer','accepted','rejected','declined')),
  source text,                       -- funnel: conversion by source
  rejected_reason text,              -- archive lanes capture the reason
  applied_at timestamptz DEFAULT now(),
  provisioned_member_id uuid,        -- set on accept → the org_members row created
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_applicants_cohort ON public.org_applicants(cohort_id, stage);

CREATE TABLE IF NOT EXISTS public.org_applicant_scores (   -- rubric; anti-anchoring
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES public.org_applicants(id) ON DELETE CASCADE,
  interviewer_id uuid NOT NULL,      -- org_members.id
  criterion text NOT NULL,           -- technical | communication | culture_fit | prior_experience
  score numeric NOT NULL CHECK (score BETWEEN 0 AND 5),
  weight numeric DEFAULT 1,
  notes text,
  submitted_at timestamptz,          -- NULL ⇒ NOT submitted ⇒ notes stay PRIVATE (enforced in API)
  created_at timestamptz DEFAULT now(),
  UNIQUE (applicant_id, interviewer_id, criterion)
);
CREATE INDEX IF NOT EXISTS idx_applicant_scores_applicant ON public.org_applicant_scores(applicant_id);

CREATE TABLE IF NOT EXISTS public.org_application_forms (  -- form builder → public branded link
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cohort_id uuid REFERENCES public.org_cohorts(id) ON DELETE CASCADE,
  fields jsonb DEFAULT '[]'::jsonb,  -- [{kind:'short_text'|'long_text'|'dropdown'|'file'|'ticker', ...}]
  public_slug text UNIQUE,
  is_open boolean DEFAULT false,
  blind_screening boolean DEFAULT false,   -- hide name/school/photo until Interview (redacted server-side)
  created_at timestamptz DEFAULT now()
);

-- ── Membership lifecycle (extend org_members; joined_at + cohort_id already exist → no-op) ──
ALTER TABLE public.org_members
  ADD COLUMN IF NOT EXISTS cohort_id        uuid REFERENCES public.org_cohorts(id),
  ADD COLUMN IF NOT EXISTS lifecycle_status text DEFAULT 'active',
     -- onboarding | active | on_leave | graduating | alumni | departed
  ADD COLUMN IF NOT EXISTS joined_at        timestamptz,
  ADD COLUMN IF NOT EXISTS departed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS departure_reason text,
  ADD COLUMN IF NOT EXISTS mentor_member_id uuid;

-- ── Onboarding: tasks ARE Assignments (no parallel to-do system) ────────────
CREATE TABLE IF NOT EXISTS public.org_onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cohort_id uuid NOT NULL REFERENCES public.org_cohorts(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL,       -- → org_assignments (requires the 20260720 migration)
  sort_order integer DEFAULT 0,
  is_gate boolean DEFAULT false,     -- must complete before submitting a live pitch
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_cohort ON public.org_onboarding_tasks(cohort_id, sort_order);

-- ── Alumni ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_alumni_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  cohort_id uuid REFERENCES public.org_cohorts(id),
  grad_term text,
  final_rating numeric,              -- FROZEN at graduation (from org_member_rating)
  final_pitch_count integer,
  employer text, employer_industry text,   -- ib | pe | am | consulting | other
  role_title text, linkedin_url text,
  placed_within_6mo boolean,
  engagement_flags text[] DEFAULT '{}',    -- guest_speaker | mentor | recruiter | donor
  created_at timestamptz DEFAULT now(),
  UNIQUE (member_id)
);
CREATE INDEX IF NOT EXISTS idx_alumni_org ON public.org_alumni_records(org_id, employer_industry);

-- ── RLS — org-scoped; applicant PII gated to exec/PM + assigned interviewers ─
ALTER TABLE public.org_applicants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_applicant_scores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_application_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_onboarding_tasks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_alumni_records    ENABLE ROW LEVEL SECURITY;

-- applicants: managers OR an assigned interviewer (has a score row) may read;
-- managers write. (The public application form intake uses the admin client.)
DROP POLICY IF EXISTS "read applicants" ON public.org_applicants;
CREATE POLICY "read applicants" ON public.org_applicants FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
  OR EXISTS (SELECT 1 FROM public.org_applicant_scores s
             WHERE s.applicant_id = id
               AND s.interviewer_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true))
);
DROP POLICY IF EXISTS "managers write applicants" ON public.org_applicants;
CREATE POLICY "managers write applicants" ON public.org_applicants FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- scores: an interviewer reads/writes their OWN score rows; managers read/write
-- all. Cross-interviewer notes hiding (until submitted) is enforced in the API.
DROP POLICY IF EXISTS "read applicant scores" ON public.org_applicant_scores;
CREATE POLICY "read applicant scores" ON public.org_applicant_scores FOR SELECT USING (
  interviewer_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);
DROP POLICY IF EXISTS "write applicant scores" ON public.org_applicant_scores;
CREATE POLICY "write applicant scores" ON public.org_applicant_scores FOR ALL USING (
  interviewer_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  interviewer_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- application forms: managers only (public serving uses the admin client).
DROP POLICY IF EXISTS "managers manage forms" ON public.org_application_forms;
CREATE POLICY "managers manage forms" ON public.org_application_forms FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- onboarding tasks: members read own org; managers write.
DROP POLICY IF EXISTS "read onboarding tasks" ON public.org_onboarding_tasks;
CREATE POLICY "read onboarding tasks" ON public.org_onboarding_tasks FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "managers write onboarding tasks" ON public.org_onboarding_tasks;
CREATE POLICY "managers write onboarding tasks" ON public.org_onboarding_tasks FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- alumni: members read own org; managers write.
DROP POLICY IF EXISTS "read alumni" ON public.org_alumni_records;
CREATE POLICY "read alumni" ON public.org_alumni_records FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "managers write alumni" ON public.org_alumni_records;
CREATE POLICY "managers write alumni" ON public.org_alumni_records FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);
