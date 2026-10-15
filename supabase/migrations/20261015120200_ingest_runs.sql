-- One row per scheduled ingest run, written by the cron routes themselves
-- (src/lib/ingest-runs.js). The Sanctions page's Data integrity card reads
-- the latest attempt and the latest success per source, so a failed or
-- skipped run is never shown as an update.
--   status  'ok'       finished and wrote what it read
--           'partial'  finished but some writes failed
--           'failed'   stopped on an error or a validation guard
--           'skipped'  ran but had nothing to do (e.g. no new data)
--           'running'  started, not finished (a crash leaves it here)
-- Additive and idempotent. Service role only.

create table if not exists public.ingest_runs (
  id bigserial primary key,
  source text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'ok', 'partial', 'failed', 'skipped')),
  rows_read integer,
  rows_written integer,
  validation text,
  note text
);

create index if not exists ingest_runs_source_started_idx
  on public.ingest_runs (source, started_at desc);

alter table public.ingest_runs enable row level security;

-- Latest attempt and latest success per source, for the status card.
create or replace function public.ingest_status(p_sources text[])
returns table (
  source text,
  last_attempt_at timestamptz,
  last_status text,
  last_note text,
  last_ok_at timestamptz,
  last_ok_rows integer
)
language sql
stable
security definer
set search_path = public
as $$
  select s.source,
         la.started_at, la.status, la.note,
         lo.finished_at, lo.rows_written
  from unnest(p_sources) as s(source)
  left join lateral (
    select r.started_at, r.status, coalesce(r.note, r.validation) as note
    from public.ingest_runs r
    where r.source = s.source
    order by r.started_at desc
    limit 1
  ) la on true
  left join lateral (
    select r.finished_at, r.rows_written
    from public.ingest_runs r
    where r.source = s.source and r.status = 'ok'
    order by r.started_at desc
    limit 1
  ) lo on true;
$$;

revoke all on function public.ingest_status(text[]) from public, anon, authenticated;
grant execute on function public.ingest_status(text[]) to service_role;
