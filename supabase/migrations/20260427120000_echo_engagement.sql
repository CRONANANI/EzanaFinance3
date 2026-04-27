-- ════════════════════════════════════════════════════════════
-- Ezana Echo article engagement: per-user likes and comments
-- ════════════════════════════════════════════════════════════
-- Article IDs are stored as TEXT (slugs) rather than UUIDs.
-- This supports both seed-file mock articles and DB-stored articles.

-- ── Likes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS echo_article_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_echo_likes_article ON echo_article_likes(article_id);
CREATE INDEX IF NOT EXISTS idx_echo_likes_user ON echo_article_likes(user_id);

ALTER TABLE echo_article_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can see how many likes an article has (and who liked it, for "X liked this" UI later)
CREATE POLICY "Anyone can read likes"
  ON echo_article_likes FOR SELECT
  USING (true);

-- Users can only insert their own like record
CREATE POLICY "Users can insert their own likes"
  ON echo_article_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own like record
CREATE POLICY "Users can delete their own likes"
  ON echo_article_likes FOR DELETE
  USING (auth.uid() = user_id);


-- ── Comments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS echo_article_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_echo_comments_article ON echo_article_comments(article_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_echo_comments_user ON echo_article_comments(user_id);

ALTER TABLE echo_article_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read non-deleted comments
CREATE POLICY "Anyone can read non-deleted comments"
  ON echo_article_comments FOR SELECT
  USING (deleted_at IS NULL);

-- Authenticated users can post comments
CREATE POLICY "Users can insert their own comments"
  ON echo_article_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can edit their own comments
CREATE POLICY "Users can update their own comments"
  ON echo_article_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can soft-delete their own comments
-- (We use UPDATE setting deleted_at instead of hard DELETE so threads keep their structure)


-- ── Aggregate views for fast lookup ─────────────────────────
-- These let us fetch counts in a single query without aggregating on every request.

CREATE OR REPLACE VIEW echo_article_engagement_counts AS
SELECT
  article_id,
  (SELECT COUNT(*) FROM echo_article_likes l WHERE l.article_id = a.article_id) AS like_count,
  (SELECT COUNT(*) FROM echo_article_comments c WHERE c.article_id = a.article_id AND c.deleted_at IS NULL) AS comment_count
FROM (
  SELECT DISTINCT article_id FROM echo_article_likes
  UNION
  SELECT DISTINCT article_id FROM echo_article_comments
) a;

-- ── Helper RPCs ──────────────────────────────────────────────
-- Fast batched lookup: given an array of article IDs, return their counts.
-- Used by the article list page to show like/comment counts without N+1 queries.

CREATE OR REPLACE FUNCTION get_echo_engagement_counts(article_ids TEXT[])
RETURNS TABLE (
  article_id TEXT,
  like_count BIGINT,
  comment_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  WITH all_ids AS (SELECT unnest(article_ids) AS aid)
  SELECT
    all_ids.aid AS article_id,
    COALESCE((SELECT COUNT(*) FROM echo_article_likes l WHERE l.article_id = all_ids.aid), 0) AS like_count,
    COALESCE((SELECT COUNT(*) FROM echo_article_comments c WHERE c.article_id = all_ids.aid AND c.deleted_at IS NULL), 0) AS comment_count
  FROM all_ids;
$$;

GRANT EXECUTE ON FUNCTION get_echo_engagement_counts(TEXT[]) TO authenticated, anon;
