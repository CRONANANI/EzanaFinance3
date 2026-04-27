-- ════════════════════════════════════════════════════════════
-- Login history: tracks daily logins for the streak feature.
-- Granularity: one record per user per UTC date (de-duped via UNIQUE).
-- Powers the 30-bar visual on the home dashboard.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT login_history_user_date_unique UNIQUE (user_id, login_date)
);

CREATE INDEX IF NOT EXISTS idx_login_history_user_date
  ON public.user_login_history (user_id, login_date DESC);

ALTER TABLE public.user_login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own login history"
  ON public.user_login_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own login history"
  ON public.user_login_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
