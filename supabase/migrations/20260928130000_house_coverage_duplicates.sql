-- House index ingest: record duplicate DocIDs dropped before the upsert.
--
-- The Clerk's yearly index files list some DocIDs more than once within a
-- single year (amendments and re-posts of the same document). Postgres rejects
-- an INSERT ... ON CONFLICT DO UPDATE whose batch names the same conflict key
-- twice, and rejects the entire batch, so the ingest now collapses rows to one
-- per doc_id before chunking.
--
-- house_disclosure_coverage.filings therefore counts UNIQUE filings — what is
-- actually stored and served. This column carries the difference, so a year
-- whose stored count falls short of the source's line count reads as
-- de-duplicated rather than as a partial download.
--
-- Nullable with no default: rows written before this migration genuinely do
-- not know their duplicate count, and backfilling them with 0 would assert
-- something the ingest never measured.

alter table public.house_disclosure_coverage
  add column if not exists duplicates integer;

comment on column public.house_disclosure_coverage.duplicates is
  'Repeat DocIDs the Clerk listed within this year, dropped before upsert. NULL for rows written before duplicate tracking existed. filings + duplicates = the source file''s line count.';
