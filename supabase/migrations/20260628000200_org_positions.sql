-- Org-level positions table. Multi-source: brokerage (plaid/snaptrade), CSV upload, manual entry.
CREATE TABLE IF NOT EXISTS public.org_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.org_teams(id) ON DELETE SET NULL,
  ticker TEXT NOT NULL,
  name TEXT,
  shares NUMERIC NOT NULL CHECK (shares > 0),
  avg_cost NUMERIC NOT NULL CHECK (avg_cost >= 0),
  current_price NUMERIC,
  sector TEXT,
  source TEXT NOT NULL CHECK (source IN ('plaid', 'snaptrade', 'csv', 'manual')),
  unified_account_id UUID REFERENCES public.unified_accounts(id) ON DELETE SET NULL,
  added_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_positions_org_team ON public.org_positions (org_id, team_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_org_positions_ticker ON public.org_positions (org_id, ticker) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_org_positions_source ON public.org_positions (org_id, source);

ALTER TABLE public.org_positions ENABLE ROW LEVEL SECURITY;

-- Members of the org can read their org's positions
DROP POLICY IF EXISTS "org members read org_positions" ON public.org_positions;
CREATE POLICY "org members read org_positions" ON public.org_positions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_positions.org_id AND om.user_id = auth.uid()
    )
  );

-- Writes go through service role (API routes enforce manage_positions permission server-side)
DROP POLICY IF EXISTS "service role manages org_positions" ON public.org_positions;
CREATE POLICY "service role manages org_positions" ON public.org_positions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_org_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_org_positions_updated_at ON public.org_positions;
CREATE TRIGGER tg_org_positions_updated_at
  BEFORE UPDATE ON public.org_positions
  FOR EACH ROW EXECUTE FUNCTION public.tg_org_positions_updated_at();
