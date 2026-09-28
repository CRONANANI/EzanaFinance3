-- Run log for the House → BigQuery mirror (/api/cron/sync-house-bq).
--
-- The sync replaces each BigQuery table wholesale with WRITE_TRUNCATE, then
-- compares BigQuery's own COUNT(*) with the number of rows it read out of
-- Supabase. That comparison is the only thing standing between "the load job
-- returned success" and "the mirror actually equals the source", so its
-- result is recorded per table per run rather than living only in an HTTP
-- response nobody kept.
--
-- ok = false rows are the ones worth looking at: they mean the mirror is
-- stale or partial, and the BigQuery side is still whatever the previous
-- successful run left there.

create table if not exists public.house_bq_sync_log (
  id            bigserial primary key,
  -- 'filings' or 'trades' — the BigQuery table, not the Supabase one.
  -- Not named "table": that is a reserved word and every query would have to
  -- quote it.
  table_name    text        not null,
  rows_exported integer     not null default 0,
  rows_loaded   integer     not null default 0,
  -- BigQuery's job id, so a bad run can be opened in the console directly.
  -- Null when the export failed before a load job was ever created.
  job_id        text,
  ran_at        timestamptz not null default now(),
  ok            boolean     not null default false
);

-- The usual question is "how did the last few runs go", per table.
create index if not exists house_bq_sync_log_table_ran_idx
  on public.house_bq_sync_log (table_name, ran_at desc);

alter table public.house_bq_sync_log enable row level security;

-- No policies: this is operational telemetry with no reader in the app. The
-- service-role key used by the cron route bypasses RLS, so the route writes
-- fine while anon and authenticated clients see nothing.

comment on table public.house_bq_sync_log is
  'One row per table per run of /api/cron/sync-house-bq. ok=false means BigQuery does not match Supabase and the mirror is stale.';
