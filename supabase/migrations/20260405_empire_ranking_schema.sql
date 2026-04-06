-- ═══════════════════════════════════════════════════════════
-- Empire Ranking & Analysis — Database Schema
-- Phase 2: tables, indexes, RLS, seed data
-- ═══════════════════════════════════════════════════════════

-- ─── Extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Table: empire_countries ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.empire_countries (
  code          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  flag          TEXT NOT NULL,
  region        TEXT NOT NULL,
  population    BIGINT,
  is_eurozone   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.empire_countries IS
  'Static metadata for the 11 major powers tracked in the Empire Ranking system.';

-- ─── Table: empire_indicators ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.empire_indicators (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code    TEXT NOT NULL REFERENCES public.empire_countries (code) ON DELETE CASCADE,
  indicator_code  TEXT NOT NULL,
  indicator_name  TEXT NOT NULL,
  source          TEXT NOT NULL CHECK (source IN ('worldbank', 'fred', 'sipri', 'acled', 'manual')),
  year            INTEGER NOT NULL CHECK (year BETWEEN 1500 AND 2100),
  value           NUMERIC,
  unit            TEXT,
  source_url      TEXT,
  ingested_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (country_code, indicator_code, year)
);

COMMENT ON TABLE public.empire_indicators IS
  'Raw time-series data from external data sources. One row per country × indicator × year.';

CREATE INDEX IF NOT EXISTS idx_empire_indicators_country_year
  ON public.empire_indicators (country_code, year DESC);
CREATE INDEX IF NOT EXISTS idx_empire_indicators_code
  ON public.empire_indicators (indicator_code);
CREATE INDEX IF NOT EXISTS idx_empire_indicators_source
  ON public.empire_indicators (source, ingested_at DESC);

-- ─── Table: empire_dimension_scores ────────────────────────
CREATE TABLE IF NOT EXISTS public.empire_dimension_scores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code  TEXT NOT NULL REFERENCES public.empire_countries (code) ON DELETE CASCADE,
  dimension     TEXT NOT NULL,
  year          INTEGER NOT NULL CHECK (year BETWEEN 1500 AND 2100),
  z_score       NUMERIC NOT NULL,
  raw_value     NUMERIC,
  computed_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (country_code, dimension, year)
);

COMMENT ON TABLE public.empire_dimension_scores IS
  'Z-scored power dimensions (Dalio framework). Computed by feature engineering from empire_indicators.';

CREATE INDEX IF NOT EXISTS idx_empire_dim_country_year
  ON public.empire_dimension_scores (country_code, year DESC);
CREATE INDEX IF NOT EXISTS idx_empire_dim_dimension_year
  ON public.empire_dimension_scores (dimension, year DESC);

-- ─── Table: empire_rankings ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.empire_rankings (
  country_code    TEXT PRIMARY KEY REFERENCES public.empire_countries (code) ON DELETE CASCADE,
  overall_score   NUMERIC NOT NULL CHECK (overall_score BETWEEN 0 AND 1),
  rank            INTEGER NOT NULL,
  trajectory      TEXT NOT NULL CHECK (trajectory IN ('up', 'down', 'flat')),
  as_of_year      INTEGER NOT NULL,
  computed_at     TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.empire_rankings IS
  'Current headline 0-1 empire score and rank for each country. Updated when new indicators arrive.';

CREATE INDEX IF NOT EXISTS idx_empire_rankings_rank
  ON public.empire_rankings (rank);

-- ─── Table: empire_ingest_log ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.empire_ingest_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT NOT NULL CHECK (source IN ('worldbank', 'fred', 'sipri', 'acled')),
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed', 'partial')),
  rows_ingested   INTEGER DEFAULT 0,
  error_message   TEXT,
  metadata        JSONB
);

COMMENT ON TABLE public.empire_ingest_log IS
  'Audit log for API ingestion runs. Tracks source, timing, row counts, errors.';

CREATE INDEX IF NOT EXISTS idx_empire_log_source_started
  ON public.empire_ingest_log (source, started_at DESC);

-- ─── Trigger: auto-update updated_at ──────────────────────
CREATE OR REPLACE FUNCTION public.empire_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_empire_countries_updated_at ON public.empire_countries;
CREATE TRIGGER trg_empire_countries_updated_at
  BEFORE UPDATE ON public.empire_countries
  FOR EACH ROW
  EXECUTE PROCEDURE public.empire_set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.empire_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empire_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empire_dimension_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empire_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empire_ingest_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empire_countries_read_all" ON public.empire_countries;
CREATE POLICY "empire_countries_read_all"
  ON public.empire_countries FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "empire_indicators_read_all" ON public.empire_indicators;
CREATE POLICY "empire_indicators_read_all"
  ON public.empire_indicators FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "empire_dimension_scores_read_all" ON public.empire_dimension_scores;
CREATE POLICY "empire_dimension_scores_read_all"
  ON public.empire_dimension_scores FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "empire_rankings_read_all" ON public.empire_rankings;
CREATE POLICY "empire_rankings_read_all"
  ON public.empire_rankings FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "empire_ingest_log_no_public_read" ON public.empire_ingest_log;
CREATE POLICY "empire_ingest_log_no_public_read"
  ON public.empire_ingest_log FOR SELECT USING (FALSE);

-- Writes are only allowed via service role (which bypasses RLS automatically)

-- ═══════════════════════════════════════════════════════════
-- Seed data: the 11 countries tracked in Dalio's framework
-- ═══════════════════════════════════════════════════════════
INSERT INTO public.empire_countries (code, name, flag, region, is_eurozone) VALUES
  ('USA', 'United States', '🇺🇸', 'North America', FALSE),
  ('CHN', 'China', '🇨🇳', 'Asia', FALSE),
  ('EUR', 'Eurozone', '🇪🇺', 'Europe', TRUE),
  ('DEU', 'Germany', '🇩🇪', 'Europe', TRUE),
  ('JPN', 'Japan', '🇯🇵', 'Asia', FALSE),
  ('IND', 'India', '🇮🇳', 'Asia', FALSE),
  ('GBR', 'United Kingdom', '🇬🇧', 'Europe', FALSE),
  ('FRA', 'France', '🇫🇷', 'Europe', TRUE),
  ('NLD', 'Netherlands', '🇳🇱', 'Europe', TRUE),
  ('RUS', 'Russia', '🇷🇺', 'Europe', FALSE),
  ('ESP', 'Spain', '🇪🇸', 'Europe', TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  flag = EXCLUDED.flag,
  region = EXCLUDED.region,
  is_eurozone = EXCLUDED.is_eurozone;

-- ═══════════════════════════════════════════════════════════
-- Seed: initial rankings from Dalio's 2021 snapshot
-- ═══════════════════════════════════════════════════════════
INSERT INTO public.empire_rankings (country_code, overall_score, rank, trajectory, as_of_year) VALUES
  ('USA', 0.87, 1,  'flat', 2021),
  ('CHN', 0.75, 2,  'up',   2021),
  ('EUR', 0.55, 3,  'down', 2021),
  ('DEU', 0.37, 4,  'down', 2021),
  ('JPN', 0.30, 5,  'down', 2021),
  ('IND', 0.27, 6,  'up',   2021),
  ('GBR', 0.27, 7,  'down', 2021),
  ('FRA', 0.25, 8,  'down', 2021),
  ('NLD', 0.25, 9,  'flat', 2021),
  ('RUS', 0.23, 10, 'down', 2021),
  ('ESP', 0.20, 11, 'flat', 2021)
ON CONFLICT (country_code) DO UPDATE SET
  overall_score = EXCLUDED.overall_score,
  rank = EXCLUDED.rank,
  trajectory = EXCLUDED.trajectory,
  as_of_year = EXCLUDED.as_of_year,
  computed_at = NOW();
