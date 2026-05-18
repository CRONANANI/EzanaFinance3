-- Track which API populated each cached news row (Massive vs Alpha Vantage).
ALTER TABLE public.news_articles_cache
ADD COLUMN IF NOT EXISTS source_api TEXT DEFAULT 'massive';
