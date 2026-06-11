-- Phase 1: org chart backbone — term tracking, sector coverage, advisor oversight.
-- Additive and idempotent.

-- Term / succession tracking on members
ALTER TABLE public.org_members
  ADD COLUMN IF NOT EXISTS term_start DATE,
  ADD COLUMN IF NOT EXISTS term_end DATE,
  ADD COLUMN IF NOT EXISTS is_graduating BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reports_to UUID REFERENCES public.org_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN public.org_members.reports_to IS 'Self-referential FK building the org-chart hierarchy. NULL = top of chart (e.g. CIO).';
COMMENT ON COLUMN public.org_members.title IS 'Display title on the org chart, e.g. "Chief Investment Officer", "Energy Sector Lead".';

CREATE INDEX IF NOT EXISTS idx_org_members_reports_to ON public.org_members(reports_to);

-- GICS sector coverage assignments
CREATE TABLE IF NOT EXISTS public.org_sector_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  sector TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, member_id, sector)
);

CREATE INDEX IF NOT EXISTS idx_sector_coverage_org ON public.org_sector_coverage(org_id);
CREATE INDEX IF NOT EXISTS idx_sector_coverage_member ON public.org_sector_coverage(member_id);

-- Advisor oversight relationships (which advisor supervises which member/team)
CREATE TABLE IF NOT EXISTS public.org_advisor_oversight (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  advisor_member_id UUID NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  supervised_member_id UUID REFERENCES public.org_members(id) ON DELETE CASCADE,
  supervised_team_id UUID REFERENCES public.org_teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advisor_oversight_org ON public.org_advisor_oversight(org_id);

-- RLS
ALTER TABLE public.org_sector_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_advisor_oversight ENABLE ROW LEVEL SECURITY;

-- READ: any active member of the org
DROP POLICY IF EXISTS "members read sector coverage" ON public.org_sector_coverage;
CREATE POLICY "members read sector coverage" ON public.org_sector_coverage
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  );

-- WRITE: executives + portfolio managers
DROP POLICY IF EXISTS "managers write sector coverage" ON public.org_sector_coverage;
CREATE POLICY "managers write sector coverage" ON public.org_sector_coverage
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
  ) WITH CHECK (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
  );

DROP POLICY IF EXISTS "members read advisor oversight" ON public.org_advisor_oversight;
CREATE POLICY "members read advisor oversight" ON public.org_advisor_oversight
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  );

-- WRITE: executives only (includes faculty advisors, who are role 'executive')
DROP POLICY IF EXISTS "executives write advisor oversight" ON public.org_advisor_oversight;
CREATE POLICY "executives write advisor oversight" ON public.org_advisor_oversight
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
  ) WITH CHECK (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
  );

-- org_members previously had no UPDATE policy, so the org-chart PATCH (title,
-- reports_to, term dates, is_graduating) would be blocked by RLS. Allow managers
-- to update members within their own org. The org_members SELECT policy is the
-- simple `user_id = auth.uid()`, so this subquery resolves against the caller's
-- own membership and does not recurse.
DROP POLICY IF EXISTS "managers update org members" ON public.org_members;
CREATE POLICY "managers update org members" ON public.org_members
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
  ) WITH CHECK (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
  );

NOTIFY pgrst, 'reload schema';
