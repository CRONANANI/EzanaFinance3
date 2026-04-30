-- ════════════════════════════════════════════════════════════════════════════
-- ELO Sprint 5 — Competitions
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  starting_balance NUMERIC(14, 2) NOT NULL DEFAULT 100000,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming','active','ended','scored','cancelled')),
  elo_top1pct_award INTEGER NOT NULL DEFAULT 500,
  elo_top10pct_award INTEGER NOT NULL DEFAULT 200,
  elo_bottom25pct_penalty INTEGER NOT NULL DEFAULT -50,
  scored_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT competitions_dates_valid CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_competitions_status_dates
  ON public.competitions (status, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_competitions_active
  ON public.competitions (status, ends_at)
  WHERE status IN ('active', 'upcoming');

COMMENT ON TABLE public.competitions IS
  'Admin-created portfolio competitions with ELO swings at endpoints.';
COMMENT ON COLUMN public.competitions.rules IS
  'JSONB rules constraining what participants can do; enforcement is admin-defined.';

CREATE TABLE IF NOT EXISTS public.competition_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starting_balance NUMERIC(14, 2) NOT NULL,
  current_value NUMERIC(14, 2),
  return_pct NUMERIC(8, 4),
  rank INTEGER,
  elo_change INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scored_at TIMESTAMPTZ,
  UNIQUE (competition_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_participants_competition
  ON public.competition_participants (competition_id, return_pct DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_comp_participants_user
  ON public.competition_participants (user_id, joined_at DESC);

COMMENT ON TABLE public.competition_participants IS
  'User opt-in to a competition + final ranking and ELO impact.';

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competitions readable by all" ON public.competitions;
CREATE POLICY "competitions readable by all"
  ON public.competitions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "competition_participants readable by all" ON public.competition_participants;
CREATE POLICY "competition_participants readable by all"
  ON public.competition_participants FOR SELECT TO authenticated
  USING (true);
