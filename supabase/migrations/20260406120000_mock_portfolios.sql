-- Paper / mock trading portfolio persisted per user (Supabase sync from client)

CREATE TABLE IF NOT EXISTS public.mock_portfolios (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  portfolio JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mock_portfolios_updated ON public.mock_portfolios(updated_at DESC);

ALTER TABLE public.mock_portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own mock portfolio" ON public.mock_portfolios;
CREATE POLICY "Users manage own mock portfolio" ON public.mock_portfolios
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
