-- ════════════════════════════════════════════════════════════════════════════
-- ELO Pillar B — Portfolio Performance Pipeline
--
-- portfolio_value_snapshots — daily total value per user (real + mock split)
-- monthly_portfolio_perf — computed monthly metrics + ELO awarded
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.portfolio_value_snapshots (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  real_value NUMERIC(14, 2) DEFAULT 0,
  mock_value NUMERIC(14, 2) DEFAULT 0,
  total_value NUMERIC(14, 2) GENERATED ALWAYS AS (
    COALESCE(real_value, 0) + COALESCE(mock_value, 0)
  ) STORED,
  has_real_brokerage BOOLEAN NOT NULL DEFAULT FALSE,
  has_mock_portfolio BOOLEAN NOT NULL DEFAULT FALSE,
  source_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_pvs_user_recent
  ON public.portfolio_value_snapshots (user_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_pvs_date
  ON public.portfolio_value_snapshots (snapshot_date DESC);

COMMENT ON TABLE public.portfolio_value_snapshots IS
  'Daily snapshot of each user''s portfolio value, split by real vs mock. Foundation for ELO Pillar B.';
COMMENT ON COLUMN public.portfolio_value_snapshots.real_value IS
  'Alpaca portfolio_value + Plaid investment holdings totals at snapshot time.';
COMMENT ON COLUMN public.portfolio_value_snapshots.mock_value IS
  'Mock portfolio cash + position value from mock_portfolios.portfolio JSONB.';

CREATE TABLE IF NOT EXISTS public.monthly_portfolio_perf (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  is_real_brokerage BOOLEAN NOT NULL,
  start_value NUMERIC(14, 2) NOT NULL,
  end_value NUMERIC(14, 2) NOT NULL,
  return_pct NUMERIC(8, 4) NOT NULL,
  spy_return_pct NUMERIC(8, 4) NOT NULL,
  alpha_vs_spy NUMERIC(8, 4) NOT NULL,
  sharpe_90d NUMERIC(8, 4),
  monthly_score NUMERIC(8, 4) NOT NULL,
  elo_awarded INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, year, month, is_real_brokerage)
);

CREATE INDEX IF NOT EXISTS idx_mpp_user_recent
  ON public.monthly_portfolio_perf (user_id, year DESC, month DESC);

COMMENT ON TABLE public.monthly_portfolio_perf IS
  'Computed monthly performance metrics + ELO awards. One row per user/month/portfolio-type.';
COMMENT ON COLUMN public.monthly_portfolio_perf.elo_awarded IS
  'Effective delta after real-vs-mock weight and lifetime cap clamp.';

ALTER TABLE public.user_elo
  ADD COLUMN IF NOT EXISTS lifetime_pillar_b_awarded INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.user_elo.lifetime_pillar_b_awarded IS
  'Running total of positive ELO from monthly portfolio performance (Pillar B), max 3500.';

ALTER TABLE public.portfolio_value_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_portfolio_perf ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "snapshots readable by owner" ON public.portfolio_value_snapshots;
CREATE POLICY "snapshots readable by owner"
  ON public.portfolio_value_snapshots FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "monthly_perf readable by owner" ON public.monthly_portfolio_perf;
CREATE POLICY "monthly_perf readable by owner"
  ON public.monthly_portfolio_perf FOR SELECT TO authenticated
  USING (user_id = auth.uid());
