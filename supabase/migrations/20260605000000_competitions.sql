-- Community trading competitions (scaffold — payout integration is follow-up)

CREATE TABLE IF NOT EXISTS public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'platform' CHECK (visibility IN ('friends', 'platform')),
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'ended')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  prize_elo_first integer DEFAULT 500,
  prize_elo_second integer DEFAULT 300,
  prize_elo_third integer DEFAULT 150,
  prize_cash_first numeric(12,2) DEFAULT 0,
  prize_cash_second numeric(12,2) DEFAULT 0,
  prize_cash_third numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.competition_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  performance_pct numeric(10,4) DEFAULT 0,
  rank integer,
  UNIQUE (competition_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_competitions_status ON public.competitions(status, starts_at);
CREATE INDEX IF NOT EXISTS idx_competition_entries_comp ON public.competition_entries(competition_id, performance_pct DESC);

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competitions_read_all" ON public.competitions FOR SELECT USING (true);
CREATE POLICY "competition_entries_read_all" ON public.competition_entries FOR SELECT USING (true);
