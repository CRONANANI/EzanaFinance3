-- Precomputed dataset page snapshots (datasets-cleanup-and-speed, Step 4.2).
-- One row per page section ('committees:overview', 'contracts:overview', ...).
-- A page reads ONE row through the Next data cache instead of running its
-- aggregates per request; builders refresh rows from cron and after ingest.
--
-- NOT executed by the implementer. Noah applies it by hand in the SQL Editor.
-- Additive and idempotent; safe to run more than once.

create table if not exists public.dataset_snapshots (
  key text primary key,
  payload jsonb not null,
  built_at timestamptz not null default now(),
  build_ms int,
  source_max_updated_at timestamptz
);

alter table public.dataset_snapshots enable row level security;
do $$ begin
  create policy "public read" on public.dataset_snapshots for select using (true);
exception when duplicate_object then null; end $$;
-- writes: service role only (no insert/update/delete policy)
revoke insert, update, delete on public.dataset_snapshots from anon, authenticated;
