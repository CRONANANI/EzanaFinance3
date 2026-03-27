-- Create missing course progress tables for Learning Center

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

ALTER TABLE user_course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own course progress" ON user_course_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_course_progress_user ON user_course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_course ON user_course_progress(course_id);

-- Create track progress table
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

ALTER TABLE user_track_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own track progress" ON user_track_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_track_progress_user ON user_track_progress(user_id);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
