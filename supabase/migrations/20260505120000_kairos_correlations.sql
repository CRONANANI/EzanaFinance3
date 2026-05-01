CREATE TABLE IF NOT EXISTS public.kairos_correlations (
  id BIGSERIAL PRIMARY KEY,
  region_id TEXT NOT NULL,
  commodity_symbol TEXT NOT NULL,
  weather_variable TEXT NOT NULL,
  lookahead_days INT NOT NULL,
  pearson_r NUMERIC(7, 4) NOT NULL,
  p_value NUMERIC(8, 6),
  sample_count INT NOT NULL,
  top_quintile_mean_return NUMERIC(8, 4),
  bottom_quintile_mean_return NUMERIC(8, 4),
  history_window TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (region_id, commodity_symbol, weather_variable, lookahead_days, history_window)
);

CREATE INDEX IF NOT EXISTS idx_kc_region_strength
  ON public.kairos_correlations (region_id, pearson_r DESC);

ALTER TABLE public.kairos_correlations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kc readable by authenticated" ON public.kairos_correlations;
CREATE POLICY "kc readable by authenticated"
  ON public.kairos_correlations FOR SELECT TO authenticated
  USING (true);
