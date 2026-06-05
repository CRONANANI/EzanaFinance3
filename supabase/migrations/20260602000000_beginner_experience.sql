-- Adaptive beginner experience: tips preference, seen keys, activity counters
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS beginner_tips_pref TEXT DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS beginner_seen JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS analyses_run INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lessons_completed_count INT DEFAULT 0;
