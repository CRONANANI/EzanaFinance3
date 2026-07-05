-- Lobbying filings: carry the filing-type code + a registration flag so the UI
-- can distinguish a registration / no-activity report (legitimately no dollar
-- figure) from a real reported $0. Additive columns; the ingest cron populates
-- them. Backfill is_registration for any rows already cached.

ALTER TABLE public.lobbying_filings
  ADD COLUMN IF NOT EXISTS filing_type_code TEXT,
  ADD COLUMN IF NOT EXISTS is_registration  BOOLEAN DEFAULT FALSE;

-- Best-effort backfill from the human-readable filing_type already stored.
UPDATE public.lobbying_filings
SET is_registration = TRUE
WHERE is_registration IS DISTINCT FROM TRUE
  AND filing_type ILIKE '%registration%';
