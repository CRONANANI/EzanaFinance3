-- Creator calls (prediction challenges) + community back/fade + track record.
--
-- A partner posts a "call" on a ticker (bullish/bearish, optional target and
-- deadline). Members back or fade it. When the creator (or an admin) resolves
-- it hit/missed, the outcome rolls into the creator's public track record.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.creator_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticker TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('bullish', 'bearish')),
  thesis TEXT,
  target_price NUMERIC,
  resolves_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'hit', 'missed', 'void')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creator_call_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID REFERENCES public.creator_calls(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('back', 'fade')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (call_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_calls_creator ON public.creator_calls(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_calls_status ON public.creator_calls(status);
CREATE INDEX IF NOT EXISTS idx_creator_calls_created ON public.creator_calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_call_votes_call ON public.creator_call_votes(call_id);

ALTER TABLE public.creator_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_call_votes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creator_calls' AND policyname = 'Anyone can read calls') THEN
    CREATE POLICY "Anyone can read calls" ON public.creator_calls FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creator_calls' AND policyname = 'Creators can create calls') THEN
    CREATE POLICY "Creators can create calls" ON public.creator_calls FOR INSERT WITH CHECK (auth.uid() = creator_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creator_calls' AND policyname = 'Creators can update own calls') THEN
    CREATE POLICY "Creators can update own calls" ON public.creator_calls FOR UPDATE USING (auth.uid() = creator_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creator_call_votes' AND policyname = 'Anyone can read call votes') THEN
    CREATE POLICY "Anyone can read call votes" ON public.creator_call_votes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creator_call_votes' AND policyname = 'Users can vote on calls') THEN
    CREATE POLICY "Users can vote on calls" ON public.creator_call_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creator_call_votes' AND policyname = 'Users can change own call vote') THEN
    CREATE POLICY "Users can change own call vote" ON public.creator_call_votes FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creator_call_votes' AND policyname = 'Users can remove own call vote') THEN
    CREATE POLICY "Users can remove own call vote" ON public.creator_call_votes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
