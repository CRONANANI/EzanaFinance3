-- Phase 2: org invites + fund configuration. Additive, RLS enabled.

CREATE TABLE IF NOT EXISTS public.org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'analyst' CHECK (role IN ('executive','portfolio_manager','analyst')),
  sub_role TEXT,
  team_id UUID REFERENCES public.org_teams(id) ON DELETE SET NULL,
  cohort_id UUID REFERENCES public.org_cohorts(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days')
);
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON public.org_invites(org_id, status);
ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "execs manage invites" ON public.org_invites;
CREATE POLICY "execs manage invites" ON public.org_invites FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
);

CREATE TABLE IF NOT EXISTS public.org_fund_config (
  org_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  fund_display_name TEXT,
  benchmark_symbol TEXT DEFAULT 'SPY',
  term_type TEXT DEFAULT 'semester' CHECK (term_type IN ('semester','quarter','year')),
  term_start DATE,
  term_end DATE,
  accent_color TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.org_fund_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members read fund config" ON public.org_fund_config;
CREATE POLICY "members read fund config" ON public.org_fund_config FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);
DROP POLICY IF EXISTS "execs write fund config" ON public.org_fund_config;
CREATE POLICY "execs write fund config" ON public.org_fund_config FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
);

NOTIFY pgrst, 'reload schema';
