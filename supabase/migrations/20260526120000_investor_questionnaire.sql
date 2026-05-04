-- Investor questionnaire (onboarding step 5) — progressive answers + computed profile

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS investor_questionnaire JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS investor_questionnaire_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS investor_profile JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.investor_questionnaire IS 'Per-question answers saved progressively during onboarding questionnaire';
COMMENT ON COLUMN public.profiles.investor_questionnaire_completed IS 'True once all 7 questions answered — never show questionnaire again';
COMMENT ON COLUMN public.profiles.investor_profile IS 'Computed investor profile (level, risk, interests) derived from questionnaire answers';
