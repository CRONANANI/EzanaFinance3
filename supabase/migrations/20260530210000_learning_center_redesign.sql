-- Learning Center redesign — bookmarks, daily quests, streaks, ELO view

CREATE TABLE IF NOT EXISTS public.user_course_bookmarks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_user_course_bookmarks_user
  ON public.user_course_bookmarks(user_id, created_at DESC);

ALTER TABLE public.user_course_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own bookmarks" ON public.user_course_bookmarks;
CREATE POLICY "users read own bookmarks"
  ON public.user_course_bookmarks FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own bookmarks" ON public.user_course_bookmarks;
CREATE POLICY "users insert own bookmarks"
  ON public.user_course_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users delete own bookmarks" ON public.user_course_bookmarks;
CREATE POLICY "users delete own bookmarks"
  ON public.user_course_bookmarks FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_daily_quests (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_date DATE NOT NULL,
  primary_course_id TEXT,
  bonus_quests JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quest_date)
);

ALTER TABLE public.user_daily_quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own quests" ON public.user_daily_quests;
CREATE POLICY "users read own quests"
  ON public.user_daily_quests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users manage own quests" ON public.user_daily_quests;
CREATE POLICY "users manage own quests"
  ON public.user_daily_quests FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_learning_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  days_this_week JSONB NOT NULL DEFAULT '[false,false,false,false,false,false,false]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_learning_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own streak" ON public.user_learning_streaks;
CREATE POLICY "users read own streak"
  ON public.user_learning_streaks FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users manage own streak" ON public.user_learning_streaks;
CREATE POLICY "users manage own streak"
  ON public.user_learning_streaks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.user_learning_elo AS
SELECT
  ue.user_id,
  ue.current_rating AS total_elo,
  COALESCE(weekly.delta_sum, 0)::INTEGER AS weekly_delta,
  ue.tier,
  ue.last_activity_at AS last_activity
FROM public.user_elo ue
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(delta), 0) AS delta_sum
  FROM public.elo_transactions
  WHERE user_id = ue.user_id
    AND category = 'learning'
    AND created_at > now() - INTERVAL '7 days'
) weekly ON TRUE;

GRANT SELECT ON public.user_learning_elo TO authenticated;
