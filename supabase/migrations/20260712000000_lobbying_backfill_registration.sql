-- Backfill is_registration so the top-spenders board (which filters
-- is_registration = false) stops dropping real dollar-bearing reports.
--
-- Rows ingested before is_registration was populated are NULL. In SQL,
-- `is_registration = false` does NOT match NULL, so those reports were excluded
-- from the leaderboard even though they carry real dollars. Recompute the flag
-- from the filing-type code/label for every NULL row (LDA registration codes
-- start with "R": RR/RA/RE…; quarterly reports are Q1–Q4/MM/…), then pin the
-- column default to false so future rows are never NULL.

UPDATE public.lobbying_filings
SET is_registration = (
  upper(coalesce(filing_type_code, '')) ~ '^R'
  OR lower(coalesce(filing_type, '')) LIKE '%registration%'
)
WHERE is_registration IS NULL;

ALTER TABLE public.lobbying_filings
  ALTER COLUMN is_registration SET DEFAULT false;
