-- Partner onboarding questionnaire — investing interests + content direction.
-- Mirrors the investor_questionnaire column pattern, but partner-specific so it
-- never overlaps with the data already gathered in the partner application.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS partner_questionnaire JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.partner_questionnaire IS 'Partner onboarding answers (investing focus, content plans, experience, goals, cadence) saved progressively during the partner onboarding questionnaire';
