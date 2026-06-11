-- Phase 3: academic / SMIF structure. Additive + idempotent.

-- 11. Cohorts (academic terms). Members belong to a cohort; cohorts archive on graduation.
CREATE TABLE IF NOT EXISTS public.org_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  term_type TEXT DEFAULT 'semester' CHECK (term_type IN ('semester','quarter','year')),
  starts_on DATE,
  ends_on DATE,
  is_current BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  archived_snapshot JSONB,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);
CREATE INDEX IF NOT EXISTS idx_cohorts_org ON public.org_cohorts(org_id);

ALTER TABLE public.org_members
  ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES public.org_cohorts(id) ON DELETE SET NULL;

-- 12. Grading: faculty advisors grade analyst work (pitches, research notes, coverage)
CREATE TABLE IF NOT EXISTS public.org_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.org_cohorts(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  graded_by UUID REFERENCES auth.users(id),
  work_type TEXT NOT NULL CHECK (work_type IN ('pitch','research_note','coverage','participation','overall')),
  work_id UUID,
  score NUMERIC,
  max_score NUMERIC DEFAULT 100,
  letter TEXT,
  feedback TEXT,
  rubric JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grades_org ON public.org_grades(org_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON public.org_grades(student_id);

-- Faculty assignments to students (advisor assigns work/coverage to specific students)
CREATE TABLE IF NOT EXISTS public.org_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.org_cohorts(id) ON DELETE SET NULL,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  assignment_type TEXT DEFAULT 'pitch' CHECK (assignment_type IN ('pitch','research','coverage','reading','other')),
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned','submitted','graded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assignments_to ON public.org_assignments(assigned_to, status);

-- 13. Inter-university competition: link existing competitions to participating orgs as teams
CREATE TABLE IF NOT EXISTS public.competition_org_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.org_teams(id) ON DELETE SET NULL,
  entered_by UUID REFERENCES auth.users(id),
  current_value NUMERIC(14,2),
  return_pct NUMERIC,
  rank INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','withdrawn','scored')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competition_id, org_id)
);
CREATE INDEX IF NOT EXISTS idx_comp_org_entries_comp ON public.competition_org_entries(competition_id);

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS is_inter_org BOOLEAN DEFAULT false;

-- 14. IPS / compliance rules per org, plus a violation log
CREATE TABLE IF NOT EXISTS public.org_ips_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'max_position_pct','max_sector_pct','min_positions','max_positions',
    'prohibited_ticker','prohibited_sector','min_market_cap','max_single_trade_pct','cash_floor_pct')),
  rule_value JSONB NOT NULL,
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ips_rules_org ON public.org_ips_rules(org_id, is_active);

CREATE TABLE IF NOT EXISTS public.org_ips_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.org_ips_rules(id) ON DELETE SET NULL,
  source_type TEXT CHECK (source_type IN ('pitch','trade','portfolio')),
  source_id UUID,
  ticker TEXT,
  detail TEXT,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('warning','block')),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ips_violations_org ON public.org_ips_violations(org_id, resolved);

-- ===== RLS =====
ALTER TABLE public.org_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_org_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_ips_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_ips_violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read cohorts" ON public.org_cohorts;
CREATE POLICY "members read cohorts" ON public.org_cohorts FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "executives write cohorts" ON public.org_cohorts;
CREATE POLICY "executives write cohorts" ON public.org_cohorts FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true));

DROP POLICY IF EXISTS "students read own grades" ON public.org_grades;
CREATE POLICY "students read own grades" ON public.org_grades FOR SELECT USING (
  student_id = auth.uid()
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true));
DROP POLICY IF EXISTS "advisors write grades" ON public.org_grades;
CREATE POLICY "advisors write grades" ON public.org_grades FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true));

DROP POLICY IF EXISTS "members read own assignments" ON public.org_assignments;
CREATE POLICY "members read own assignments" ON public.org_assignments FOR SELECT USING (
  assigned_to = auth.uid()
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true));
DROP POLICY IF EXISTS "managers write assignments" ON public.org_assignments;
CREATE POLICY "managers write assignments" ON public.org_assignments FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true));
-- Assignees may update their own assignment (the route restricts them to the
-- 'submitted' status transition).
DROP POLICY IF EXISTS "assignees update own assignment" ON public.org_assignments;
CREATE POLICY "assignees update own assignment" ON public.org_assignments FOR UPDATE USING (
  assigned_to = auth.uid()
) WITH CHECK (assigned_to = auth.uid());

DROP POLICY IF EXISTS "members read comp entries" ON public.competition_org_entries;
CREATE POLICY "members read comp entries" ON public.competition_org_entries FOR SELECT USING (
  competition_id IN (
    SELECT competition_id FROM public.competition_org_entries e2
    WHERE e2.org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  ));
DROP POLICY IF EXISTS "managers manage comp entries" ON public.competition_org_entries;
CREATE POLICY "managers manage comp entries" ON public.competition_org_entries FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true));

DROP POLICY IF EXISTS "members read ips rules" ON public.org_ips_rules;
CREATE POLICY "members read ips rules" ON public.org_ips_rules FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "executives write ips rules" ON public.org_ips_rules;
CREATE POLICY "executives write ips rules" ON public.org_ips_rules FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true));

DROP POLICY IF EXISTS "members read violations" ON public.org_ips_violations;
CREATE POLICY "members read violations" ON public.org_ips_violations FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "managers resolve violations" ON public.org_ips_violations;
CREATE POLICY "managers resolve violations" ON public.org_ips_violations FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true));
-- The IPS check engine logs violations on behalf of the acting member (an
-- analyst submitting a pitch), so any active member may INSERT a violation row
-- for their own org. Resolving (UPDATE) stays manager-only via the policy above.
DROP POLICY IF EXISTS "members log violations" ON public.org_ips_violations;
CREATE POLICY "members log violations" ON public.org_ips_violations FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));

NOTIFY pgrst, 'reload schema';
