-- ════════════════════════════════════════════════════════════════════════════
-- Kairos: commodity historical prices (cache layer)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.kairos_commodity_prices (
  symbol TEXT NOT NULL,
  trade_date DATE NOT NULL,
  open NUMERIC(14, 4),
  high NUMERIC(14, 4),
  low NUMERIC(14, 4),
  close NUMERIC(14, 4) NOT NULL,
  volume BIGINT,
  source TEXT NOT NULL DEFAULT 'fmp',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (symbol, trade_date)
);

CREATE INDEX IF NOT EXISTS idx_kcp_symbol_date
  ON public.kairos_commodity_prices (symbol, trade_date DESC);

CREATE TABLE IF NOT EXISTS public.kairos_commodity_cache_status (
  symbol TEXT PRIMARY KEY,
  earliest_date DATE,
  latest_date DATE,
  last_full_refresh_at TIMESTAMPTZ,
  source TEXT
);

ALTER TABLE public.kairos_commodity_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kairos_commodity_cache_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kcp readable by authenticated" ON public.kairos_commodity_prices;
CREATE POLICY "kcp readable by authenticated"
  ON public.kairos_commodity_prices FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "kccs readable by authenticated" ON public.kairos_commodity_cache_status;
CREATE POLICY "kccs readable by authenticated"
  ON public.kairos_commodity_cache_status FOR SELECT TO authenticated
  USING (true);
