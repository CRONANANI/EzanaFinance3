-- Sonar production validation queue (Nov 17, 2026)
--
-- An operator queues a run by inserting into sonar_validation_runs (service role only, so
-- only someone with database administrator access can). The scheduled route
-- /api/cron/sonar-validate (CRON_SECRET) works the queue: each question goes through the
-- same planner, executors, readers, model and budgets as /api/sonar/landing-query, with no
-- user account and no ping reservation, so no customer is charged and no user data is read.
-- Results land in sonar_validation_results. Nothing here is reachable by a browser.

create table if not exists public.sonar_validation_runs (
  id uuid primary key default gen_random_uuid(),
  requested_at timestamptz not null default now(),
  requested_by text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'cancelled')),
  only_items text[],
  include_chains boolean not null default true,
  started_at timestamptz,
  finished_at timestamptz,
  environment jsonb,
  summary jsonb
);

create table if not exists public.sonar_validation_results (
  run_id uuid not null references public.sonar_validation_runs(id) on delete cascade,
  item text not null,
  question text not null,
  expected_scenario text,
  planned_scenario text,
  executable boolean,
  ok boolean not null default false,
  findings jsonb,
  ms integer,
  degraded text[],
  steps jsonb,
  model jsonb,
  sections jsonb,
  sources integer,
  error text,
  created_at timestamptz not null default now(),
  primary key (run_id, item)
);

alter table public.sonar_validation_runs enable row level security;
alter table public.sonar_validation_results enable row level security;
revoke all on public.sonar_validation_runs from anon, authenticated;
revoke all on public.sonar_validation_results from anon, authenticated;
grant all on public.sonar_validation_runs to service_role;
grant all on public.sonar_validation_results to service_role;
