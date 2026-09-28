-- Lobbying ingest: track rows the LDA API actually returned, and reset the
-- quarters that were falsely marked complete.
--
-- The ingest requested page_size=100 and then decided completion with
--   last_page * 100 >= total_count
-- while the API was returning its default 25 rows per page. Every quarter
-- therefore read as finished after about a quarter of its filings, and
-- because a complete quarter moves to the incremental phase, the backfill
-- stopped there permanently. Measured against the live tables:
--
--   quarter   total_count   last_page   stored   last_page * 25
--   2025 Q1        27,433         278    7,094            6,950
--   2025 Q3        26,928         287    7,341            7,175
--   2024 Q1        24,767         265    6,722            6,625
--   2024 Q2        23,975         249    6,314            6,225
--
-- The stored count tracks last_page * 25 in every quarter, never * 100.
--
-- Completion is now taken from the API itself — the absence of a `next` link,
-- with rows_fetched >= total_count as a backstop — so nothing depends on
-- knowing the page size. This column persists that progress across runs.

alter table public.lobbying_ingest_state
  add column if not exists rows_fetched integer not null default 0;

comment on column public.lobbying_ingest_state.rows_fetched is
  'Cumulative rows the LDA API returned for this quarter during backfill. Counts returned rows, not upserted rows: the data-quality gate can reject a batch without that meaning fewer pages exist.';

-- Re-open the quarters that were marked complete while about three quarters of
-- their filings were never requested. Safe to re-walk: lobbying_filings upserts
-- on uuid, so pages already stored are overwritten, not duplicated.
update public.lobbying_ingest_state
   set complete = false,
       phase = 'backfill',
       last_page = 0,
       rows_fetched = 0
 where year in (2024, 2025, 2026);
