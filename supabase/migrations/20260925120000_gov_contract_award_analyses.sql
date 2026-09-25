-- Cache for the per-award AI analysis shown in the Government Contracts award
-- modal (/api/gov-contracts/award-analysis).
--
-- Why a separate table rather than another column: the modal opens awards from
-- TWO tables. gov_contract_recent_awards (the ticker) already carries an
-- `analysis` column, but usaspending_contract_awards (the explorer table) does
-- not, so awards opened from the explorer had nowhere to cache and would have
-- paid for a model call on every open. Keying the cache by award id instead of
-- hanging it off a row serves both sources with one lookup, and leaves the two
-- ingest tables free to be truncated and re-synced without losing the analyses.
--
-- The route still reads gov_contract_recent_awards.analysis as a fallback, so
-- rows cached before this table existed are not re-generated.

CREATE TABLE IF NOT EXISTS public.gov_contract_award_analyses (
  generated_award_id  TEXT PRIMARY KEY,            -- USAspending generated_unique_award_id
  analysis            JSONB NOT NULL,              -- {summary, sectors[], uncertainty}
  model               TEXT NOT NULL,               -- model that produced it, so a model change is traceable
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gov_contract_award_analyses ENABLE ROW LEVEL SECURITY;

-- No policies. The route reads and writes with the service-role admin client;
-- the analysis reaches the browser through that route, never by a direct client
-- read, so anon/authenticated need no access at all.
