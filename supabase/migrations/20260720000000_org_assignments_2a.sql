-- ============================================================================
-- Assignments redesign (direction 2a) — Phase 1 schema migration.
-- ADDITIVE ONLY: no existing column is dropped or renamed. Extends
-- org_assignments and adds five child tables for multi-assignee targeting, the
-- review loop (submissions + threaded comments), attachment metadata, and
-- reusable templates. RLS on every new table mirrors org_assignments exactly
-- (analysts see their own; executives/PMs see all), scoped by org_id.
--
-- NOTE: 'overdue' is NOT a stored status — it is derived in the API
-- (due_date < now() AND status NOT IN ('complete','graded')). Never persisted.
-- ============================================================================

-- ── Extend org_assignments ──────────────────────────────────────────────────
ALTER TABLE public.org_assignments
  ADD COLUMN IF NOT EXISTS instructions   text,
  ADD COLUMN IF NOT EXISTS ticker         text,
  ADD COLUMN IF NOT EXISTS sector         text,
  ADD COLUMN IF NOT EXISTS progress_pct   smallint DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS require_upload boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring      text     CHECK (recurring IN ('weekly','monthly')),
  ADD COLUMN IF NOT EXISTS template_id    uuid,
  ADD COLUMN IF NOT EXISTS rubric_max     smallint,
  ADD COLUMN IF NOT EXISTS rubric_score   smallint,
  ADD COLUMN IF NOT EXISTS rubric_comment text;

-- Widen the inline CHECK enums (Postgres auto-names them <table>_<col>_check).
-- assignment_type: + 'model', 'meeting_prep'
ALTER TABLE public.org_assignments DROP CONSTRAINT IF EXISTS org_assignments_assignment_type_check;
ALTER TABLE public.org_assignments
  ADD CONSTRAINT org_assignments_assignment_type_check
  CHECK (assignment_type IN ('pitch','research','coverage','reading','model','meeting_prep','other'));

-- status: + 'in_progress', 'under_review', 'returned', 'complete'
-- ('overdue' is DERIVED, never stored — intentionally not in this list.)
ALTER TABLE public.org_assignments DROP CONSTRAINT IF EXISTS org_assignments_status_check;
ALTER TABLE public.org_assignments
  ADD CONSTRAINT org_assignments_status_check
  CHECK (status IN ('assigned','in_progress','submitted','under_review','returned','complete','graded'));

-- ── Multi-assignee targeting: members / team / cohort / role / whole org ─────
CREATE TABLE IF NOT EXISTS public.org_assignment_assignees (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.org_assignments(id) ON DELETE CASCADE,
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_type   text NOT NULL CHECK (target_type IN ('member','team','cohort','role','org')),
  target_id     uuid,          -- member/team/cohort id; NULL for 'org' and 'role'
  target_role   text,          -- e.g. 'Healthcare Analyst' when target_type='role'
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asg_assignees_assignment ON public.org_assignment_assignees(assignment_id);
CREATE INDEX IF NOT EXISTS idx_asg_assignees_org ON public.org_assignment_assignees(org_id, target_type, target_id);

-- ── Review loop: version history (submissions) + threaded comments ──────────
CREATE TABLE IF NOT EXISTS public.org_assignment_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.org_assignments(id) ON DELETE CASCADE,
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  submitted_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version       integer NOT NULL DEFAULT 1,
  note          text,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asg_submissions_assignment ON public.org_assignment_submissions(assignment_id, version);

CREATE TABLE IF NOT EXISTS public.org_assignment_comments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.org_assignments(id) ON DELETE CASCADE,
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body          text NOT NULL,
  is_return     boolean DEFAULT false,   -- true when this comment accompanied a "Return for revision"
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asg_comments_assignment ON public.org_assignment_comments(assignment_id, created_at);

-- ── Attachment metadata (storage bucket is a separate decision — see Phase 3) ─
CREATE TABLE IF NOT EXISTS public.org_assignment_attachments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.org_assignments(id) ON DELETE CASCADE,
  submission_id uuid REFERENCES public.org_assignment_submissions(id) ON DELETE CASCADE,
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name     text NOT NULL,
  storage_path  text NOT NULL,
  size_bytes    bigint,
  uploaded_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asg_attachments_assignment ON public.org_assignment_attachments(assignment_id);

-- ── Reusable templates (one-click reassign to next cohort) ──────────────────
CREATE TABLE IF NOT EXISTS public.org_assignment_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  assignment_type text NOT NULL,
  title           text,
  instructions    text,
  sector          text,
  require_upload  boolean DEFAULT false,
  created_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asg_templates_org ON public.org_assignment_templates(org_id);

-- The template_id FK on org_assignments (added above) references templates.
ALTER TABLE public.org_assignments
  DROP CONSTRAINT IF EXISTS org_assignments_template_id_fkey;
ALTER TABLE public.org_assignments
  ADD CONSTRAINT org_assignments_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES public.org_assignment_templates(id) ON DELETE SET NULL;

-- ── RLS — mirror org_assignments: managers (exec/PM) all; analysts own ──────
ALTER TABLE public.org_assignment_assignees   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_assignment_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_assignment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_assignment_templates   ENABLE ROW LEVEL SECURITY;

-- Helper predicates (inlined per policy):
--   IS_MANAGER(org): org_id IN (managers of my orgs)
--   MINE(assignment_id): the assignment is directly assigned to me, OR I'm a
--                        'member' target of it via org_assignment_assignees.

-- org_assignment_assignees ---------------------------------------------------
DROP POLICY IF EXISTS "read assignment assignees" ON public.org_assignment_assignees;
CREATE POLICY "read assignment assignees" ON public.org_assignment_assignees FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
  OR EXISTS (SELECT 1 FROM public.org_assignments a WHERE a.id = assignment_id AND a.assigned_to = auth.uid())
  OR (target_type = 'member' AND target_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true))
);
DROP POLICY IF EXISTS "managers write assignment assignees" ON public.org_assignment_assignees;
CREATE POLICY "managers write assignment assignees" ON public.org_assignment_assignees FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- org_assignment_submissions -------------------------------------------------
DROP POLICY IF EXISTS "read assignment submissions" ON public.org_assignment_submissions;
CREATE POLICY "read assignment submissions" ON public.org_assignment_submissions FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
  OR submitted_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.org_assignments a WHERE a.id = assignment_id AND a.assigned_to = auth.uid())
);
DROP POLICY IF EXISTS "assignee or manager writes submissions" ON public.org_assignment_submissions;
CREATE POLICY "assignee or manager writes submissions" ON public.org_assignment_submissions FOR ALL USING (
  submitted_by = auth.uid()
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  submitted_by = auth.uid()
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- org_assignment_comments ----------------------------------------------------
DROP POLICY IF EXISTS "read assignment comments" ON public.org_assignment_comments;
CREATE POLICY "read assignment comments" ON public.org_assignment_comments FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
  OR author_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.org_assignments a WHERE a.id = assignment_id AND a.assigned_to = auth.uid())
);
DROP POLICY IF EXISTS "author or manager writes comments" ON public.org_assignment_comments;
CREATE POLICY "author or manager writes comments" ON public.org_assignment_comments FOR ALL USING (
  author_id = auth.uid()
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  author_id = auth.uid()
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- org_assignment_attachments -------------------------------------------------
DROP POLICY IF EXISTS "read assignment attachments" ON public.org_assignment_attachments;
CREATE POLICY "read assignment attachments" ON public.org_assignment_attachments FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
  OR uploaded_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.org_assignments a WHERE a.id = assignment_id AND a.assigned_to = auth.uid())
);
DROP POLICY IF EXISTS "uploader or manager writes attachments" ON public.org_assignment_attachments;
CREATE POLICY "uploader or manager writes attachments" ON public.org_assignment_attachments FOR ALL USING (
  uploaded_by = auth.uid()
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  uploaded_by = auth.uid()
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- org_assignment_templates ---------------------------------------------------
DROP POLICY IF EXISTS "members read templates" ON public.org_assignment_templates;
CREATE POLICY "members read templates" ON public.org_assignment_templates FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);
DROP POLICY IF EXISTS "managers write templates" ON public.org_assignment_templates;
CREATE POLICY "managers write templates" ON public.org_assignment_templates FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);
