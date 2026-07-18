-- Resumable-ingest checkpoint store. Vercel function timeouts make the
-- FY2012-FY2026 USAspending backfill a multi-invocation job: each run processes
-- a bounded number of pages and persists where it stopped so the next run
-- resumes instead of restarting. Also holds the incremental sync's cursor.
--
-- Internal bookkeeping only — service-role writes (RLS bypass); no public read.
create table if not exists public.ingest_progress (
  job          text primary key,          -- 'backfill-usaspending' | 'incremental-usaspending'
  fiscal_year  int,                        -- FY cursor (backfill)
  sub_window   int not null default 0,     -- month index 0..11 within the FY (backfill)
  page         int not null default 1,     -- page cursor within the current sub-window
  cursor_date  date,                        -- last_synced_action_date (incremental)
  status       text,                        -- 'running' | 'done' | 'error' | 'idle'
  detail       jsonb,                        -- counters, last error, per-FY tallies
  updated_at   timestamptz not null default now()
);

alter table public.ingest_progress enable row level security;
-- No policies → only the service-role key (which bypasses RLS) can read/write.
revoke all on public.ingest_progress from anon, authenticated;
