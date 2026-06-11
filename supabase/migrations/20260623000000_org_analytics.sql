-- Phase 4: analytics & reporting. Additive + idempotent.

-- Cached fund performance snapshots (computed periodically; avoids recomputing
-- attribution on every load).
CREATE TABLE IF NOT EXISTS public.org_fund_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.org_cohorts(id) ON DELETE SET NULL,
  snapshot_date DATE NOT NULL,
  total_value NUMERIC(16,2),
  total_cost NUMERIC(16,2),
  return_pct NUMERIC,
  benchmark_return_pct NUMERIC,
  alpha_pct NUMERIC,
  attribution JSONB,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_fund_snapshots_org ON public.org_fund_snapshots(org_id, snapshot_date DESC);

-- Generated stakeholder reports (record of exports).
CREATE TABLE IF NOT EXISTS public.org_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.org_cohorts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  period_label TEXT,
  generated_by UUID REFERENCES auth.users(id),
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_reports_org ON public.org_reports(org_id, created_at DESC);

ALTER TABLE public.org_fund_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read fund snapshots" ON public.org_fund_snapshots;
CREATE POLICY "members read fund snapshots" ON public.org_fund_snapshots FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "managers write fund snapshots" ON public.org_fund_snapshots;
CREATE POLICY "managers write fund snapshots" ON public.org_fund_snapshots FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true));

DROP POLICY IF EXISTS "members read reports" ON public.org_reports;
CREATE POLICY "members read reports" ON public.org_reports FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "managers write reports" ON public.org_reports;
CREATE POLICY "managers write reports" ON public.org_reports FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true));

NOTIFY pgrst, 'reload schema';
