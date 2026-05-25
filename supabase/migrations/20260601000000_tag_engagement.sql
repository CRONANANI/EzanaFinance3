-- Per-tag engagement intensity on user_interest_profiles for ML persona scoring.

ALTER TABLE public.user_interest_profiles
  ADD COLUMN IF NOT EXISTS tag_engagement JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_interest_profiles.tag_engagement IS
  'Per-tag engagement histogram. Shape: { "<tag-id>": { opens, reads, keyword_clicks, saves, shares, total_dwell_ms } }';

CREATE INDEX IF NOT EXISTS idx_user_interest_profiles_tag_engagement
  ON public.user_interest_profiles USING GIN (tag_engagement);
