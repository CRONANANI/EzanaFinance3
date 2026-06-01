CREATE TABLE IF NOT EXISTS public.institution_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  logo_url TEXT,
  square_logo_url TEXT,
  category TEXT NOT NULL DEFAULT 'brokerage',
  snaptrade_slug TEXT,
  snaptrade_brokerage_type TEXT,
  snaptrade_allows_trading BOOLEAN,
  plaid_institution_id TEXT,
  plaid_products TEXT[],
  enabled BOOLEAN NOT NULL DEFAULT true,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_institution_registry_canonical
  ON public.institution_registry (lower(canonical_name));
CREATE INDEX IF NOT EXISTS idx_institution_registry_snaptrade
  ON public.institution_registry (snaptrade_slug) WHERE snaptrade_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_institution_registry_plaid
  ON public.institution_registry (plaid_institution_id) WHERE plaid_institution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_institution_registry_enabled
  ON public.institution_registry (enabled, maintenance_mode);

ALTER TABLE public.institution_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone can read institutions" ON public.institution_registry;
CREATE POLICY "anyone can read institutions" ON public.institution_registry
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "service role writes institutions" ON public.institution_registry;
CREATE POLICY "service role writes institutions" ON public.institution_registry
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.unified_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_provider TEXT NOT NULL CHECK (source_provider IN ('snaptrade', 'plaid')),
  source_account_id TEXT NOT NULL,
  institution_id UUID REFERENCES public.institution_registry(id),
  institution_name TEXT NOT NULL,
  account_fingerprint TEXT NOT NULL,
  account_name TEXT,
  account_mask TEXT,
  account_type TEXT,
  account_subtype TEXT,
  balance_total NUMERIC,
  balance_cash NUMERIC,
  currency TEXT,
  is_paper BOOLEAN NOT NULL DEFAULT false,
  status TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unified_accounts_per_provider_unique UNIQUE (source_provider, source_account_id),
  CONSTRAINT unified_accounts_dedup_unique UNIQUE (user_id, account_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_unified_accounts_user ON public.unified_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_unified_accounts_provider ON public.unified_accounts (source_provider);

ALTER TABLE public.unified_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own" ON public.unified_accounts;
CREATE POLICY "users read own" ON public.unified_accounts
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service role manages" ON public.unified_accounts;
CREATE POLICY "service role manages" ON public.unified_accounts
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.unified_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.unified_accounts(id) ON DELETE CASCADE,
  source_provider TEXT NOT NULL CHECK (source_provider IN ('snaptrade', 'plaid')),
  snapshot_date DATE NOT NULL,
  ticker TEXT NOT NULL,
  name TEXT,
  currency TEXT DEFAULT 'USD',
  quantity NUMERIC NOT NULL,
  avg_cost NUMERIC,
  aggregate_cost_basis NUMERIC,
  price NUMERIC,
  market_value NUMERIC,
  security_type TEXT,
  data_freshness TEXT NOT NULL DEFAULT 'realtime' CHECK (data_freshness IN ('realtime', 'end_of_day')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unified_positions_unique UNIQUE (account_id, snapshot_date, ticker)
);

CREATE INDEX IF NOT EXISTS idx_unified_positions_user_date ON public.unified_positions (user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_unified_positions_account_date ON public.unified_positions (account_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_unified_positions_ticker ON public.unified_positions (user_id, ticker);

ALTER TABLE public.unified_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own" ON public.unified_positions;
CREATE POLICY "users read own" ON public.unified_positions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service role manages" ON public.unified_positions;
CREATE POLICY "service role manages" ON public.unified_positions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.unified_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.unified_accounts(id) ON DELETE CASCADE,
  source_provider TEXT NOT NULL CHECK (source_provider IN ('snaptrade', 'plaid')),
  source_transaction_id TEXT NOT NULL,
  trade_date DATE NOT NULL,
  settlement_date DATE,
  type TEXT NOT NULL,
  ticker TEXT,
  name TEXT,
  quantity NUMERIC,
  price NUMERIC,
  amount NUMERIC,
  currency TEXT,
  description TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unified_transactions_unique UNIQUE (source_provider, source_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_unified_transactions_user_date ON public.unified_transactions (user_id, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_unified_transactions_account_date ON public.unified_transactions (account_id, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_unified_transactions_ticker ON public.unified_transactions (user_id, ticker);

ALTER TABLE public.unified_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own" ON public.unified_transactions;
CREATE POLICY "users read own" ON public.unified_transactions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service role manages" ON public.unified_transactions;
CREATE POLICY "service role manages" ON public.unified_transactions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.institution_registry (
  canonical_name, display_name, logo_url, square_logo_url, category,
  snaptrade_slug, snaptrade_brokerage_type, snaptrade_allows_trading,
  enabled, maintenance_mode
)
SELECT
  COALESCE(display_name, name) AS canonical_name,
  COALESCE(display_name, name) AS display_name,
  logo_url,
  square_logo_url,
  CASE
    WHEN lower(brokerage_type) LIKE '%crypto%' THEN 'crypto_exchange'
    WHEN lower(brokerage_type) LIKE '%exchange%' THEN 'crypto_exchange'
    WHEN lower(brokerage_type) LIKE '%retire%' THEN 'retirement'
    ELSE 'brokerage'
  END AS category,
  slug AS snaptrade_slug,
  brokerage_type AS snaptrade_brokerage_type,
  allows_trading AS snaptrade_allows_trading,
  enabled,
  maintenance_mode
FROM public.snaptrade_brokerages_cache
WHERE brokerage_type IS NOT NULL
ON CONFLICT ((lower(canonical_name))) DO UPDATE SET
  snaptrade_slug = EXCLUDED.snaptrade_slug,
  snaptrade_brokerage_type = EXCLUDED.snaptrade_brokerage_type,
  snaptrade_allows_trading = EXCLUDED.snaptrade_allows_trading,
  logo_url = COALESCE(institution_registry.logo_url, EXCLUDED.logo_url),
  square_logo_url = COALESCE(institution_registry.square_logo_url, EXCLUDED.square_logo_url),
  enabled = EXCLUDED.enabled,
  maintenance_mode = EXCLUDED.maintenance_mode,
  updated_at = now();
