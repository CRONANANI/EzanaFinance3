-- Sonar for organizations, part 2 (Nov 2026): the pooled deep research budget.
--
-- An organization has one monthly pool of deep research runs that its
-- executives set, and may give any member a monthly allocation inside it.
-- Executives see who is using the most (GET /api/org/sonar-budget).
--
--   1. sonar_queries.org_id: the org a ledger row was charged to.
--   2. org_sonar_budget: the monthly pool per org (no row = the app default,
--      ORG_SONAR_MONTHLY_DEEP, 100 unless set).
--   3. org_sonar_allocations: a member's monthly cap inside the pool.
--   4. reserve_sonar_ping_org_deep(): reserves an org member's deep run
--      against the pool BEFORE any spend, in one transaction under an
--      org-wide lock, so parallel runs cannot overdraw it. Refuses with
--      'org_pool', 'org_allocation', 'quota' (the member's daily pings),
--      'global' or 'not_member'. Months are UTC calendar months.
--
-- Members read their org's budget and allocations; only the server
-- (service role, after an executive check) writes them.
-- Additive and idempotent.
--
-- Guarded with to_regclass (the 20261026120000_org_privilege_guards convention), so the
-- file also applies cleanly to the local reliability harness, which has no org tables;
-- on the live database every table exists and the whole file runs.

do $migration$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.org_members') is null
     or to_regclass('public.sonar_queries') is null then
    raise notice 'org_sonar_budget: the tables it builds on are not present here; skipped.';
    return;
  end if;
  execute $sql$
alter table if exists public.sonar_queries
  add column if not exists org_id uuid references public.organizations(id) on delete set null;
create index if not exists sonar_queries_org_month_idx
  on public.sonar_queries (org_id, created_at desc) where org_id is not null;

create table if not exists public.org_sonar_budget (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  monthly_deep_runs integer not null check (monthly_deep_runs between 0 and 100000),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.org_sonar_allocations (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  monthly_deep_runs integer not null check (monthly_deep_runs between 0 and 100000),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

alter table public.org_sonar_budget enable row level security;
alter table public.org_sonar_allocations enable row level security;

drop policy if exists org_sonar_budget_read on public.org_sonar_budget;
create policy org_sonar_budget_read on public.org_sonar_budget
  for select to authenticated
  using (org_id in (select public.auth_org_ids()));

drop policy if exists org_sonar_allocations_read on public.org_sonar_allocations;
create policy org_sonar_allocations_read on public.org_sonar_allocations
  for select to authenticated
  using (org_id in (select public.auth_org_ids()));

create or replace function public.reserve_sonar_ping_org_deep(
  p_user uuid,
  p_org uuid,
  p_limit integer,
  p_global_limit integer,
  p_query text,
  p_version text,
  p_plan_tier integer,
  p_default_pool integer
)
returns table (id uuid, reason text, used integer, pool integer, org_used integer, allocation integer)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_day timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  v_month timestamptz := date_trunc('month', now() at time zone 'utc') at time zone 'utc';
  v_global int;
  v_used int := 0;
  v_pool int;
  v_org_used int := 0;
  v_alloc int;
  v_mine int := 0;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('sonar:global'));
  perform pg_advisory_xact_lock(hashtext('sonar:org:' || p_org::text));

  if p_global_limit is not null then
    select count(*) into v_global from sonar_queries where created_at >= v_day;
    if v_global >= p_global_limit then
      return query select null::uuid, 'global'::text, 0, null::int, null::int, null::int;
      return;
    end if;
  end if;

  if p_user is null or p_org is null or not exists (
    select 1 from org_members m
     where m.user_id = p_user and m.org_id = p_org and m.is_active = true
  ) then
    return query select null::uuid, 'not_member'::text, 0, null::int, null::int, null::int;
    return;
  end if;

  select count(*) into v_used from sonar_queries
   where user_id = p_user and created_at >= v_day;
  if p_limit is not null and v_used >= p_limit then
    return query select null::uuid, 'quota'::text, v_used, null::int, null::int, null::int;
    return;
  end if;

  select b.monthly_deep_runs into v_pool from org_sonar_budget b where b.org_id = p_org;
  v_pool := coalesce(v_pool, greatest(coalesce(p_default_pool, 0), 0));
  select count(*) into v_org_used from sonar_queries
   where org_id = p_org and created_at >= v_month and version like 'research:deep:%';
  if v_org_used >= v_pool then
    return query select null::uuid, 'org_pool'::text, v_used, v_pool, v_org_used, null::int;
    return;
  end if;

  select a.monthly_deep_runs into v_alloc from org_sonar_allocations a
   where a.org_id = p_org and a.user_id = p_user;
  if v_alloc is not null then
    select count(*) into v_mine from sonar_queries
     where org_id = p_org and user_id = p_user and created_at >= v_month
       and version like 'research:deep:%';
    if v_mine >= v_alloc then
      return query select null::uuid, 'org_allocation'::text, v_used, v_pool, v_org_used, v_alloc;
      return;
    end if;
  end if;

  insert into sonar_queries
    (user_id, org_id, query_text, version, plan_tier, is_guest, ip_hash, status, datasets_searched, grounded)
  values
    (p_user, p_org, coalesce(p_query, ''), p_version, coalesce(p_plan_tier, 0), false,
     null, 'reserved', '[]'::jsonb, false)
  returning sonar_queries.id into v_id;

  return query select v_id, null::text, v_used, v_pool, v_org_used + 1, v_alloc;
end;
$$;

revoke all on function public.reserve_sonar_ping_org_deep(uuid, uuid, integer, integer, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_sonar_ping_org_deep(uuid, uuid, integer, integer, text, text, integer, integer)
  to service_role;
  $sql$;
end;
$migration$;
