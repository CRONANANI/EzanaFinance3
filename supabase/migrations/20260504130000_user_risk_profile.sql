-- Quantified risk score (0-100) computed from questionnaire + activity
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS risk_category TEXT DEFAULT NULL;

COMMENT ON COLUMN public.profiles.risk_score IS 'Quantified risk tolerance 0-100 computed from questionnaire + platform activity';
COMMENT ON COLUMN public.profiles.risk_category IS 'Conservative / Moderate / Growth / Aggressive — derived from risk_score';
