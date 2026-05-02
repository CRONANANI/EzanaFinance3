-- ════════════════════════════════════════════════════════════════════════════
-- News articles cache — backed by Massive API (Polygon-compatible)
--
-- Acts as a local mirror so multiple client polls don't multiply API calls.
-- A single per-minute poller writes here; ISR feed + chain view read from it.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.news_articles_cache (
  id TEXT PRIMARY KEY,                          -- Massive's article.id
  title TEXT NOT NULL,
  description TEXT,
  article_url TEXT NOT NULL,
  image_url TEXT,
  author TEXT,
  publisher_name TEXT,
  publisher_homepage TEXT,
  publisher_favicon TEXT,
  tickers TEXT[],
  keywords TEXT[],
  insights JSONB,                               -- Sentiment + reasoning per ticker
  published_utc TIMESTAMPTZ NOT NULL,

  -- Categorization layer (we add these)
  region TEXT NOT NULL,                         -- 'US' | 'EU' | 'UK' | 'ME' | 'CN' | 'RUUA' | 'IN' | 'JPKR' | 'LATAM' | 'OCE'
  region_label TEXT NOT NULL,                   -- Human label
  topic TEXT,                                   -- Maps from keywords → 'Geopolitics' | 'Conflict' | 'Economy' | 'Energy' | 'Health' | 'Tech'
  severity TEXT,                                -- 'Low' | 'Medium' | 'High' | 'Critical'

  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nac_published ON public.news_articles_cache (published_utc DESC);
CREATE INDEX IF NOT EXISTS idx_nac_region ON public.news_articles_cache (region, published_utc DESC);
CREATE INDEX IF NOT EXISTS idx_nac_topic ON public.news_articles_cache (topic, published_utc DESC) WHERE topic IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nac_cached ON public.news_articles_cache (cached_at DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- Poll rate-limit table — single row tracking the last Massive API call.
-- The poll endpoint reads this; if last_fetched_at is < 60s ago it skips the
-- API call and returns cached results only.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.news_poll_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- Singleton row
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW() - INTERVAL '10 minutes',
  last_region_index INT NOT NULL DEFAULT 0,
  total_calls_today INT NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE
);

INSERT INTO public.news_poll_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- RLS: cache is readable by all authenticated users; only service role writes.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.news_articles_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nac read" ON public.news_articles_cache;
CREATE POLICY "nac read" ON public.news_articles_cache
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.news_poll_state ENABLE ROW LEVEL SECURITY;
-- No client policy — service role only

-- ───────────────────────────────────────────────────────────────────────────
-- Auto-evict articles older than 14 days. Cron-friendly.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.evict_old_news_cache() RETURNS INT AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.news_articles_cache WHERE cached_at < NOW() - INTERVAL '14 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
