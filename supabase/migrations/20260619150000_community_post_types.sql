-- Partner-only post formats + disclosure line for community posts.
--
-- Creators can frame a top-level post as an Analyst Take, Trade Idea, or
-- Market Brief. These are gated to partners (enforced in the API) and always
-- render a standard "not financial advice" disclaimer plus an optional
-- position/sponsorship disclosure the creator can attach.
-- Safe to re-run.

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS post_type TEXT,
  ADD COLUMN IF NOT EXISTS disclosure TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_posts_post_type_check'
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_post_type_check
      CHECK (post_type IS NULL OR post_type IN ('analyst_take', 'trade_idea', 'market_brief'));
  END IF;
END $$;

COMMENT ON COLUMN public.community_posts.post_type IS 'Partner-only post format: analyst_take | trade_idea | market_brief. NULL for standard posts.';
COMMENT ON COLUMN public.community_posts.disclosure IS 'Optional partner position/sponsorship disclosure shown with typed posts.';

NOTIFY pgrst, 'reload schema';
