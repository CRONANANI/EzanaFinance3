-- Phase 3 (scale-out): search infrastructure inside Postgres.
--
-- Two complementary techniques:
--   • pg_trgm trigram GIN indexes accelerate the existing substring searches
--     (ILIKE '%q%') on names and message content — no application change needed,
--     the planner just uses the index instead of a sequential scan.
--   • tsvector full-text indexes provide word-based, relevance-ranked search over
--     long content (community posts, news articles) via @@ websearch_to_tsquery.
--
-- Note: ADD COLUMN ... GENERATED STORED rewrites the table; run during a
-- low-traffic window for very large tables.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Trigram indexes for substring/fuzzy lookups ──────────────────────────────

-- profiles: community user search + admin user search (ILIKE on name/username).
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm
  ON public.profiles USING GIN (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm
  ON public.profiles USING GIN (username gin_trgm_ops);

-- messages: in-conversation content search (ILIKE on content).
CREATE INDEX IF NOT EXISTS idx_messages_content_trgm
  ON public.messages USING GIN (content gin_trgm_ops);

-- ── Full-text search for content (relevance-ranked) ──────────────────────────

-- Community posts: word-based search over post text. Generated tsvector keeps
-- the index in sync automatically. 'english' (two-arg form) is IMMUTABLE, which
-- a generated column requires.
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_posts_content_tsv
  ON public.community_posts USING GIN (content_tsv);

-- News articles: title weighted above description for better ranking.
ALTER TABLE public.news_articles_cache
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_nac_search_tsv
  ON public.news_articles_cache USING GIN (search_tsv);
