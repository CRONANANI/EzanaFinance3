-- Phase 2 (scale-out): performance indexes for hot read paths.
-- All additive and idempotent (IF NOT EXISTS) — safe to re-run.

-- Main community feed: SELECT ... WHERE parent_post_id IS NULL ORDER BY created_at DESC.
-- A partial index keyed on created_at serves the top-level feed without scanning
-- comment rows (which dominate the table over time).
CREATE INDEX IF NOT EXISTS idx_posts_feed_toplevel
  ON public.community_posts (created_at DESC)
  WHERE parent_post_id IS NULL;

-- "Following" feed + per-user profile feeds: WHERE parent_post_id IS NULL
-- AND user_id IN (...) ORDER BY created_at DESC.
CREATE INDEX IF NOT EXISTS idx_posts_user_toplevel
  ON public.community_posts (user_id, created_at DESC)
  WHERE parent_post_id IS NULL;

-- Comment threads: WHERE parent_post_id = $1 ORDER BY created_at.
-- Extends the existing idx_posts_parent (parent_post_id only) with the sort key.
CREATE INDEX IF NOT EXISTS idx_posts_parent_created
  ON public.community_posts (parent_post_id, created_at)
  WHERE parent_post_id IS NOT NULL;

-- Unread-notification badge/list: WHERE user_id = $1 AND read = false ORDER BY created_at DESC.
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
  ON public.user_notifications (user_id, created_at DESC)
  WHERE read = false;

-- politician performance: "most recently computed" lookups (health checks + freshness).
CREATE INDEX IF NOT EXISTS idx_pap_computed_at
  ON public.politician_annual_performance (computed_at DESC);
