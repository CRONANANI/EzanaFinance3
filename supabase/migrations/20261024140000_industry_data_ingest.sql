-- Industry data ingest: CHIPS Incentives awards (USAspending + NIST), the
-- recipient alias map, a review queue, run log and audit log
-- (industry-data-ingest-prompt.md, Step 1). Builds on
-- 20261024120000_industry_registry.sql, which must be applied first.
--
-- NOT executed by the implementer. Noah applies it by hand in the SQL Editor.
-- Additive and idempotent; safe to run more than once.
--
-- Admin check: public.is_industry_admin() reads the JWT's app_metadata.role
-- (service-role writable only, never user_metadata). The ADMIN_EMAILS
-- allowlist the app also honours is env-only and cannot be read from SQL, so
-- the admin API routes write with the service role after their own check.

create extension if not exists pg_trgm;

create or replace function public.is_industry_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

-- Raw CHIPS awards, one row per source record, never edited by hand
create table if not exists public.chips_awards (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('usaspending', 'nist')),
  source_record_id text not null,
  recipient_name text not null,
  recipient_uei text,
  parent_recipient_name text,
  award_type text,
  status text,
  amount_usd numeric,
  amount_text text,
  is_split_award boolean default false,
  city text,
  state_code text,
  country text default 'US',
  start_date date,
  end_date date,
  action_date date,
  description text,
  source_url text not null,
  fetched_at timestamptz not null default now(),
  raw jsonb not null,
  unique (source, source_record_id)
);

-- Map published recipient names / UEIs to a canonical company + ticker
create table if not exists public.recipient_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  uei text,
  company_name text not null,
  ticker text,
  confirmed_by uuid references auth.users (id),
  confirmed_at timestamptz,
  unique (alias)
);
create index if not exists recipient_aliases_uei_idx on public.recipient_aliases (uei);

-- One award can map to several sites when split
create table if not exists public.chips_award_facilities (
  award_id uuid references public.chips_awards (id) on delete cascade,
  facility_id uuid references public.industry_facilities (id) on delete cascade,
  primary key (award_id, facility_id)
);

create table if not exists public.ingest_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  fetched int default 0,
  inserted int default 0,
  updated int default 0,
  queued int default 0,
  error text
);
create index if not exists ingest_runs_job_idx on public.ingest_runs (job, started_at desc);

create table if not exists public.industry_review_queue (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  ref_table text not null,
  ref_id uuid not null,
  details jsonb not null,
  status text not null default 'open',
  resolved_by uuid references auth.users (id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz default now()
);

-- Provenance and review state on the registry tables
alter table public.industry_facilities add column if not exists review_status text not null default 'pending';
alter table public.industry_facilities add column if not exists entered_by uuid references auth.users (id);
alter table public.industry_facilities add column if not exists source_page text;
alter table public.industry_metrics add column if not exists review_status text not null default 'pending';
alter table public.industry_metrics add column if not exists entered_by uuid references auth.users (id);
alter table public.industry_metrics add column if not exists source_page text;
alter table public.industry_metrics add column if not exists supersedes uuid references public.industry_metrics (id);
alter table public.industry_risks add column if not exists review_status text not null default 'pending';
alter table public.industry_risks add column if not exists entered_by uuid references auth.users (id);

-- Audit log for every admin write
create table if not exists public.industry_audit (
  id bigserial primary key,
  table_name text not null,
  row_id uuid not null,
  action text not null,
  before jsonb,
  after jsonb,
  actor uuid references auth.users (id),
  at timestamptz default now()
);

create index if not exists chips_awards_recipient_idx on public.chips_awards (upper(recipient_name));
create index if not exists chips_awards_state_idx on public.chips_awards (state_code);
create index if not exists review_queue_open_idx on public.industry_review_queue (status, kind) where status = 'open';
create index if not exists industry_companies_name_trgm_idx
  on public.industry_companies using gin (company_name gin_trgm_ops);

-- Fuzzy suggestions for an unmatched recipient (service role / admin API).
create or replace function public.industry_company_suggestions(p_name text, p_limit int default 5)
returns table (company_name text, ticker text, score real)
language sql
stable
as $$
  select c.company_name, max(c.ticker) as ticker, max(similarity(upper(c.company_name), upper(p_name))) as score
  from public.industry_companies c
  where similarity(upper(c.company_name), upper(p_name)) > 0.2
  group by c.company_name
  order by score desc
  limit greatest(1, least(coalesce(p_limit, 5), 20))
$$;
revoke all on function public.industry_company_suggestions(text, int) from anon, authenticated;

-- RLS: raw awards and aliases are public read, service-role write.
alter table public.chips_awards enable row level security;
alter table public.recipient_aliases enable row level security;
alter table public.chips_award_facilities enable row level security;
do $$ begin
  create policy "chips_awards read" on public.chips_awards for select to anon, authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "recipient_aliases read" on public.recipient_aliases for select to anon, authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "chips_award_facilities read" on public.chips_award_facilities for select to anon, authenticated using (true);
exception when duplicate_object then null; end $$;
revoke insert, update, delete on public.chips_awards, public.recipient_aliases, public.chips_award_facilities
  from anon, authenticated;

-- RLS: runs, queue and audit are admins only (plus the service role).
alter table public.ingest_runs enable row level security;
alter table public.industry_review_queue enable row level security;
alter table public.industry_audit enable row level security;
revoke all on public.ingest_runs, public.industry_review_queue, public.industry_audit from anon;
do $$ begin
  create policy "ingest_runs admin" on public.ingest_runs for all to authenticated
    using (public.is_industry_admin()) with check (public.is_industry_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "industry_review_queue admin" on public.industry_review_queue for all to authenticated
    using (public.is_industry_admin()) with check (public.is_industry_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "industry_audit admin read" on public.industry_audit for select to authenticated
    using (public.is_industry_admin());
exception when duplicate_object then null; end $$;

-- Registry: public read only where approved (already so in the registry
-- migration); admins see every row.
do $$ begin
  create policy "industry_facilities admin read" on public.industry_facilities for select to authenticated
    using (public.is_industry_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "industry_metrics admin read" on public.industry_metrics for select to authenticated
    using (public.is_industry_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "industry_risks admin read" on public.industry_risks for select to authenticated
    using (public.is_industry_admin());
exception when duplicate_object then null; end $$;
