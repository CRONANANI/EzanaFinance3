CREATE TABLE IF NOT EXISTS public.portfolio_position_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.snaptrade_accounts(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  ticker TEXT NOT NULL,
  name TEXT,
  quantity NUMERIC NOT NULL,
  avg_cost NUMERIC,
  price NUMERIC,
  market_value NUMERIC,
  currency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pps_unique UNIQUE (account_id, snapshot_date, ticker)
);
CREATE INDEX IF NOT EXISTS idx_pps_user_date ON public.portfolio_position_snapshots(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_pps_account_date ON public.portfolio_position_snapshots(account_id, snapshot_date DESC);
ALTER TABLE public.portfolio_position_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own" ON public.portfolio_position_snapshots;
CREATE POLICY "users read own" ON public.portfolio_position_snapshots
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service role manages" ON public.portfolio_position_snapshots;
CREATE POLICY "service role manages" ON public.portfolio_position_snapshots
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.portfolio_balance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.snaptrade_accounts(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_value NUMERIC NOT NULL,
  cash NUMERIC,
  currency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pbs_unique UNIQUE (account_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_pbs_user_date ON public.portfolio_balance_snapshots(user_id, snapshot_date DESC);
ALTER TABLE public.portfolio_balance_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own" ON public.portfolio_balance_snapshots;
CREATE POLICY "users read own" ON public.portfolio_balance_snapshots
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service role manages" ON public.portfolio_balance_snapshots;
CREATE POLICY "service role manages" ON public.portfolio_balance_snapshots
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.portfolio_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.snaptrade_accounts(id) ON DELETE CASCADE,
  snaptrade_activity_id TEXT NOT NULL,
  trade_date DATE NOT NULL,
  settlement_date DATE,
  type TEXT NOT NULL,
  ticker TEXT,
  name TEXT,
  quantity NUMERIC,
  price NUMERIC,
  amount NUMERIC,
  currency TEXT,
  fx_rate NUMERIC,
  description TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pt_unique UNIQUE (account_id, snaptrade_activity_id)
);
CREATE INDEX IF NOT EXISTS idx_pt_user_date ON public.portfolio_transactions(user_id, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_pt_account_date ON public.portfolio_transactions(account_id, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_pt_ticker ON public.portfolio_transactions(user_id, ticker, trade_date DESC);
ALTER TABLE public.portfolio_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own" ON public.portfolio_transactions;
CREATE POLICY "users read own" ON public.portfolio_transactions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service role manages" ON public.portfolio_transactions;
CREATE POLICY "service role manages" ON public.portfolio_transactions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.snaptrade_account_sync_state (
  account_id UUID PRIMARY KEY REFERENCES public.snaptrade_accounts(id) ON DELETE CASCADE,
  last_position_snapshot_date DATE,
  last_balance_snapshot_date DATE,
  last_activity_synced_date DATE,
  initial_backfill_completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.snaptrade_account_sync_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service role only" ON public.snaptrade_account_sync_state;
CREATE POLICY "service role only" ON public.snaptrade_account_sync_state
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
