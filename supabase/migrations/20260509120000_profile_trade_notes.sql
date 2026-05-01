CREATE TABLE IF NOT EXISTS public.profile_trade_notes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  body TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 1000),
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);

CREATE INDEX IF NOT EXISTS idx_ptn_user ON public.profile_trade_notes (user_id);
CREATE INDEX IF NOT EXISTS idx_ptn_ticker ON public.profile_trade_notes (ticker) WHERE is_public = true;

ALTER TABLE public.profile_trade_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ptn public read" ON public.profile_trade_notes;
CREATE POLICY "ptn public read"
  ON public.profile_trade_notes FOR SELECT TO authenticated
  USING (is_public = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "ptn own insert" ON public.profile_trade_notes;
CREATE POLICY "ptn own insert"
  ON public.profile_trade_notes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ptn own update" ON public.profile_trade_notes;
CREATE POLICY "ptn own update"
  ON public.profile_trade_notes FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ptn own delete" ON public.profile_trade_notes;
CREATE POLICY "ptn own delete"
  ON public.profile_trade_notes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_ptn_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ptn_updated_at ON public.profile_trade_notes;
CREATE TRIGGER trg_ptn_updated_at
  BEFORE UPDATE ON public.profile_trade_notes
  FOR EACH ROW EXECUTE PROCEDURE public.set_ptn_updated_at();
