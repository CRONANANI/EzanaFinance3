-- Individual mock (paper) trades for persistence and history reload
CREATE TABLE IF NOT EXISTS public.mock_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  total_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mock_trades_user_created_idx ON public.mock_trades (user_id, created_at DESC);

ALTER TABLE public.mock_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own mock trades"
  ON public.mock_trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own mock trades"
  ON public.mock_trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);
