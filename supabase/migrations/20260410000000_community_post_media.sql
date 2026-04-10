-- Add image, poll, and ticker-chart embed support to community_posts
-- Create public Storage bucket "community-images" in Dashboard if uploads fail.

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS image_url       TEXT,
  ADD COLUMN IF NOT EXISTS poll_data       JSONB,
  ADD COLUMN IF NOT EXISTS ticker_embed    JSONB;

-- poll_data shape:
-- {
--   question: string,
--   options: [{ id: string, label: string, votes: number }],
--   total_votes: number,
--   ends_at: ISO timestamp or null
-- }

-- ticker_embed shape:
-- {
--   symbol: string,
--   period: '1D' | '1W' | '1M' | '3M' | '1Y',
--   highlight_price: number | null
-- }

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  option_id  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='poll_votes' AND policyname='Anyone can read poll votes') THEN
    CREATE POLICY "Anyone can read poll votes" ON public.poll_votes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='poll_votes' AND policyname='Users can vote') THEN
    CREATE POLICY "Users can vote" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='poll_votes' AND policyname='Users can change vote') THEN
    CREATE POLICY "Users can change vote" ON public.poll_votes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
