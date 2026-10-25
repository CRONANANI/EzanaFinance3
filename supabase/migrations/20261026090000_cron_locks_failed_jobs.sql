-- Reliability audit P2-14: cron overlap locks and a dead-letter table.
-- Used by src/lib/cron/with-cron-lock.js and src/lib/cron/failed-jobs.js.
-- Additive and idempotent. Service role only. Apply by hand, BEFORE the
-- other 20261026* reliability migrations (the code runs without it, unlocked).

create table if not exists public.cron_locks (
  name text primary key,
  locked_until timestamptz not null default 'epoch',
  holder text,
  locked_at timestamptz
);
alter table public.cron_locks enable row level security;

-- Claim the lock if it is free or expired. Returns true for the claimer.
create or replace function public.try_cron_lock(p_name text, p_ttl_seconds int, p_holder text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int;
begin
  insert into cron_locks (name) values (p_name) on conflict (name) do nothing;
  update cron_locks
     set locked_until = now() + make_interval(secs => greatest(p_ttl_seconds, 1)),
         holder = p_holder,
         locked_at = now()
   where name = p_name
     and locked_until < now();
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

create or replace function public.release_cron_lock(p_name text, p_holder text default null)
returns void
language sql
security definer
set search_path = public
as $$
  update cron_locks
     set locked_until = 'epoch', holder = null
   where name = p_name
     and (p_holder is null or holder = p_holder);
$$;

revoke all on function public.try_cron_lock(text, int, text) from public, anon, authenticated;
revoke all on function public.release_cron_lock(text, text) from public, anon, authenticated;
grant execute on function public.try_cron_lock(text, int, text) to service_role;
grant execute on function public.release_cron_lock(text, text) to service_role;

-- Dead letters: one row per failed cron run, webhook or drain item.
create table if not exists public.failed_jobs (
  id bigserial primary key,
  job text not null,
  payload jsonb,
  error text,
  attempts int not null default 1,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists failed_jobs_open_idx
  on public.failed_jobs (created_at desc) where resolved_at is null;
create index if not exists failed_jobs_job_idx on public.failed_jobs (job, created_at desc);
alter table public.failed_jobs enable row level security;
