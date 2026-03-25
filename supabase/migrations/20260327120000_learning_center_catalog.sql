-- Learning Center: structured curriculum, progress, badges, brokerage course flags
-- Run after auth.users exists

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  track TEXT NOT NULL,
  level TEXT NOT NULL,
  level_order INTEGER NOT NULL,
  course_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 15,
  has_quiz BOOLEAN DEFAULT true,
  quiz_questions JSONB DEFAULT '[]',
  content JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_course_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id TEXT NOT NULL,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_pct INTEGER DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  reading_complete BOOLEAN DEFAULT false,
  quiz_score INTEGER,
  quiz_passed BOOLEAN,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS user_track_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  track TEXT NOT NULL,
  current_level TEXT DEFAULT 'basic',
  basic_completed BOOLEAN DEFAULT false,
  intermediate_completed BOOLEAN DEFAULT false,
  advanced_completed BOOLEAN DEFAULT false,
  expert_completed BOOLEAN DEFAULT false,
  UNIQUE(user_id, track)
);

CREATE TABLE IF NOT EXISTS user_learning_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_course_progress_user ON user_course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_course ON user_course_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_track_progress_user ON user_track_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_badges_user ON user_learning_badges(user_id);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_track_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read courses" ON courses;
CREATE POLICY "Anyone can read courses" ON courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users own course progress" ON user_course_progress;
CREATE POLICY "Users own course progress" ON user_course_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own track progress" ON user_track_progress;
CREATE POLICY "Users own track progress" ON user_track_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own learning badges" ON user_learning_badges;
CREATE POLICY "Users own learning badges" ON user_learning_badges FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE brokerage_accounts
  ADD COLUMN IF NOT EXISTS short_selling_course_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS margin_course_completed BOOLEAN DEFAULT false;
