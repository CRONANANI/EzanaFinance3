-- Per-tour "seen" flags on profiles (JSONB for future tours without schema changes)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tours_seen JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_tours_seen_gin
  ON public.profiles USING GIN (tours_seen);
