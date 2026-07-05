-- Lobbying filings: a normalized government-entity bucket array so the rail's
-- Gov-entity group filter (Congress / Agencies / White House) can push down to
-- the DB. Buckets are house/senate/dod/hhs/epa/doe/whitehouse/treasury/other
-- (see src/lib/lobbying/entities.js entityBucket). Populated by the ingest cron
-- as it (re)ingests; the weekly rescan backfills recent quarters quickly.

ALTER TABLE public.lobbying_filings
  ADD COLUMN IF NOT EXISTS entity_buckets TEXT[],
  ADD COLUMN IF NOT EXISTS issue_buckets  TEXT[];
CREATE INDEX IF NOT EXISTS idx_lobbying_entity_buckets
  ON public.lobbying_filings USING GIN (entity_buckets);
CREATE INDEX IF NOT EXISTS idx_lobbying_issue_buckets
  ON public.lobbying_filings USING GIN (issue_buckets);
