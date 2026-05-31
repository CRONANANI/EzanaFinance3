-- Cache of SnapTrade's canonical brokerage list. Refreshed nightly by the
-- portfolio-snapshot cron (or on first /api/snaptrade/brokerages hit).
CREATE TABLE IF NOT EXISTS public.snaptrade_brokerages_cache (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT,
  url TEXT,
  logo_url TEXT,
  square_logo_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  allows_trading BOOLEAN NOT NULL DEFAULT false,
  allows_fractional_units BOOLEAN,
  open_url TEXT,
  brokerage_type TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snaptrade_brokerages_enabled
  ON public.snaptrade_brokerages_cache(enabled);

ALTER TABLE public.snaptrade_brokerages_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read brokerages" ON public.snaptrade_brokerages_cache;
CREATE POLICY "anyone can read brokerages" ON public.snaptrade_brokerages_cache
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "service role writes brokerages" ON public.snaptrade_brokerages_cache;
CREATE POLICY "service role writes brokerages" ON public.snaptrade_brokerages_cache
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
