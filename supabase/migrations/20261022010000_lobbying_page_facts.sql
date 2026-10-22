-- Lobbying Activity page, fast path (Oct 22, 2026).
--
-- Every lobbying_page_* view used to re-parse the wide lobbying_filings rows
-- (about 200 MB with their jsonb columns) and re-run lobby_norm_name's
-- regexes on each request: 1 to 13s per card, worse under ingest load.
-- This moves that work to two narrow materialized views, refreshed by
-- pg_cron after each ingest, and rewrites the views to read them. The
-- functions keep their signatures and payload shapes, so the API route and
-- the page need no change for the speed-up.
--
--   lobbying_page_fact          one row per filing: keys, money flags, and
--                               the issue codes, bodies, revolving-door names
--                               and their covered positions already pulled
--                               out of the jsonb
--   lobbying_page_contrib_fact  one row per LD-203 item with its report's
--                               year, period and posting date
--   lobbying_page_issue_label   issue code to display label
--
-- Measured on live data (FY 2025, Oct 21, 2026), warm: pulse 13.5s to 0.3s,
-- pressure 4.4s to 1.0s, rhythm (filtered) 10.4s to 0.1s, members 8.0s to
-- 0.6s, door 1.9s to 0.4s, entity drawer 15.5s to 1.5s, filings (recent)
-- 8.3s to 1.4s; the rest under 0.3s. Payloads match the previous
-- definitions view by view, with and without filters (pressure cells and
-- tied door positions now come in a fixed order; the page does not rely on
-- either order; entity ties now break on name and uuid).
--
-- Freshness: refreshed CONCURRENTLY (readers never block) at :10 past the
-- hour (filings ingest runs at :00) and :40 (contributions ingest at :30).

-- ── 1. narrow facts ──────────────────────────────────────────────────────
create materialized view if not exists public.lobbying_page_fact as
select
  f.uuid,
  f.filing_year as year,
  f.quarter,
  f.dt_posted as posted,
  f.amount,
  (f.amount > 0 and coalesce(f.is_registration, false) = false) as paid,
  f.client_name,
  f.registrant_name as firm_name,
  public.lobby_norm_name(f.client_name) as client_key,
  public.lobby_norm_name(f.registrant_name) as firm_key,
  coalesce(f.entity_buckets, '{}') as buckets,
  coalesce(array(
    select distinct i ->> 'code'
    from jsonb_array_elements(case when jsonb_typeof(f.issues) = 'array' then f.issues else '[]'::jsonb end) i
    where i ->> 'code' is not null), '{}') as issue_codes,
  coalesce(array(
    select distinct n from public.lobbying_entity_names(f.entities) n where n is not null), '{}') as entity_names,
  coalesce(array(
    select distinct l ->> 'name'
    from jsonb_array_elements(case when jsonb_typeof(f.lobbyists) = 'array' then f.lobbyists else '[]'::jsonb end) l
    where coalesce((l ->> 'revolvingDoor')::boolean, false) and l ->> 'name' is not null), '{}') as door_names,
  (select jsonb_agg(distinct jsonb_build_object('name', l ->> 'name', 'position', nullif(btrim(l ->> 'coveredPosition'), '')))
     from jsonb_array_elements(case when jsonb_typeof(f.lobbyists) = 'array' then f.lobbyists else '[]'::jsonb end) l
     where coalesce((l ->> 'revolvingDoor')::boolean, false) and l ->> 'name' is not null
       and nullif(btrim(l ->> 'coveredPosition'), '') is not null) as door_positions
from public.lobbying_filings f;

create unique index if not exists lobbying_page_fact_uuid on public.lobbying_page_fact (uuid);
create index if not exists lobbying_page_fact_yq on public.lobbying_page_fact (year, quarter);
create index if not exists lobbying_page_fact_posted on public.lobbying_page_fact (posted desc);
create index if not exists lobbying_page_fact_issues on public.lobbying_page_fact using gin (issue_codes);
create index if not exists lobbying_page_fact_buckets on public.lobbying_page_fact using gin (buckets);
create index if not exists lobbying_page_fact_client on public.lobbying_page_fact (client_name);
create index if not exists lobbying_page_fact_client_key on public.lobbying_page_fact (client_key);
create index if not exists lobbying_page_fact_firm_key on public.lobbying_page_fact (firm_key);

create materialized view if not exists public.lobbying_page_issue_label as
select i ->> 'code' as code, min(coalesce(i ->> 'display', i ->> 'code')) as label
from public.lobbying_filings f,
     jsonb_array_elements(case when jsonb_typeof(f.issues) = 'array' then f.issues else '[]'::jsonb end) i
where i ->> 'code' is not null
group by 1;

create unique index if not exists lobbying_page_issue_label_code on public.lobbying_page_issue_label (code);

create materialized view if not exists public.lobbying_page_contrib_fact as
select
  i.filing_uuid,
  i.item_index,
  r.filing_year as year,
  r.filing_period as period,
  r.dt_posted as posted,
  i.contribution_type as type,
  i.amount,
  i.contribution_date as date,
  i.contributor_name as contributor,
  i.payee_name as payee,
  i.honoree_name as honoree,
  public.lobbying_named(i.honoree_name) as honoree_named,
  public.lobbying_named(i.payee_name) as payee_named
from public.lobbying_contribution_items i
join public.lobbying_contribution_reports r on r.filing_uuid = i.filing_uuid
where i.amount > 0;

create unique index if not exists lobbying_page_contrib_fact_pk on public.lobbying_page_contrib_fact (filing_uuid, item_index);
create index if not exists lobbying_page_contrib_fact_yp on public.lobbying_page_contrib_fact (year, period);
create index if not exists lobbying_page_contrib_fact_posted on public.lobbying_page_contrib_fact (posted desc);

-- The views are read only through the functions below (service_role).
revoke all on public.lobbying_page_fact, public.lobbying_page_issue_label, public.lobbying_page_contrib_fact
  from public, anon, authenticated;
grant select on public.lobbying_page_fact, public.lobbying_page_issue_label, public.lobbying_page_contrib_fact
  to service_role;

-- ── 2. refresh ───────────────────────────────────────────────────────────
create or replace function public.refresh_lobbying_page_facts()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  refresh materialized view concurrently public.lobbying_page_fact;
  refresh materialized view concurrently public.lobbying_page_issue_label;
end
$$;

create or replace function public.refresh_lobbying_page_contrib_facts()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  refresh materialized view concurrently public.lobbying_page_contrib_fact;
end
$$;

revoke all on function public.refresh_lobbying_page_facts() from public, anon, authenticated;
revoke all on function public.refresh_lobbying_page_contrib_facts() from public, anon, authenticated;
grant execute on function public.refresh_lobbying_page_facts() to service_role;
grant execute on function public.refresh_lobbying_page_contrib_facts() to service_role;

-- ── 3. scope over the fact ───────────────────────────────────────────────
-- Same filter object as lobbying_page_ids (see 20261021120000). PL/pgSQL so
-- only active filters reach the planner; every value is a bound parameter.
create or replace function public.lobbying_page_scope(p jsonb)
returns setof public.lobbying_page_fact
language plpgsql
stable
set search_path to 'public'
as $$
declare
  v_sql text := 'select f.* from public.lobbying_page_fact f where true';
  v_year int := (p ->> 'year')::int;
  v_quarters text[] := case when jsonb_typeof(p -> 'quarters') = 'array'
                            then array(select jsonb_array_elements_text(p -> 'quarters')) end;
  v_from timestamptz := (p ->> 'from')::timestamptz;
  v_to timestamptz := (p ->> 'to')::timestamptz;
  v_issue text := nullif(p ->> 'issue', '');
  v_buckets text[] := case when jsonb_typeof(p -> 'buckets') = 'array'
                           then array(select jsonb_array_elements_text(p -> 'buckets')) end;
  v_min numeric := coalesce((p ->> 'min')::numeric, 0);
  v_public boolean := coalesce((p ->> 'public')::boolean, false);
  v_q text := nullif(p ->> 'q', '');
begin
  if v_year is not null then v_sql := v_sql || ' and f.year = $1'; end if;
  if v_quarters is not null then v_sql := v_sql || ' and f.quarter = any ($2)'; end if;
  if v_from is not null then v_sql := v_sql || ' and f.posted >= $3'; end if;
  if v_to is not null then v_sql := v_sql || ' and f.posted < $4'; end if;
  if v_issue is not null then v_sql := v_sql || ' and f.issue_codes @> array[$5]'; end if;
  if v_buckets is not null then v_sql := v_sql || ' and f.buckets && $6'; end if;
  if v_min > 0 then v_sql := v_sql || ' and f.amount >= $7'; end if;
  if v_public then
    v_sql := v_sql || ' and f.client_name in (select t.client_name from public.lobbying_client_tickers t)';
  end if;
  if v_q is not null then v_sql := v_sql || ' and (f.client_name ilike $8 or f.firm_name ilike $8)'; end if;
  return query execute v_sql using v_year, v_quarters, v_from, v_to, v_issue, v_buckets, v_min, v_q;
end
$$;

revoke all on function public.lobbying_page_scope(jsonb) from public, anon, authenticated;
grant execute on function public.lobbying_page_scope(jsonb) to service_role;

-- ── 4. the views, rewritten over the facts (same signatures and payloads) ─
create or replace function public.lobbying_page_pulse(p jsonb)
returns jsonb
language sql
stable
set search_path to 'public'
set work_mem to '16MB'
as $$
  with s as materialized (select * from public.lobbying_page_scope(p))
  select jsonb_build_object(
    'filings', (select count(*) from s),
    'paidFilings', (select count(*) from s where s.paid),
    'spend', (select coalesce(sum(s.amount), 0) from s where s.paid),
    'clients', (select count(distinct s.client_key) from s where s.client_name is not null),
    'firms', (select count(distinct s.firm_key) from s where s.firm_name is not null),
    'doorLobbyists', (select count(distinct d) from s, unnest(s.door_names) d),
    'latestPosted', (select max(s.posted) from s)
  );
$$;

create or replace function public.lobbying_page_issues(p jsonb)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  with s as materialized (select issue_codes from public.lobbying_page_scope(p)),
  agg as (select c as code, count(*) as filings from s, unnest(s.issue_codes) c group by c)
  select jsonb_build_object(
    'total', (select count(*) from s),
    'issues', coalesce((select jsonb_agg(jsonb_build_object('code', a.code, 'label', coalesce(l.label, a.code), 'filings', a.filings)
                                         order by a.filings desc, coalesce(l.label, a.code))
                        from agg a left join public.lobbying_page_issue_label l on l.code = a.code), '[]'::jsonb)
  );
$$;

create or replace function public.lobbying_page_leaders(p jsonb, p_by text default 'client', p_limit int default 15)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  with s as materialized (
    select case when p_by = 'firm' then f.firm_name else f.client_name end as raw,
           case when p_by = 'firm' then f.firm_key else f.client_key end as key,
           f.client_name, f.amount
    from public.lobbying_page_scope(p) f
    where f.paid
  ),
  grp as (
    select key, mode() within group (order by raw) as name, sum(amount) as spend, count(*) as filings
    from s where raw is not null and key <> '' group by key
  ),
  top as materialized (select * from grp order by spend desc limit greatest(least(p_limit, 50), 1)),
  tick as (
    select distinct on (s.key) s.key, t.ticker, t.verified, t.company_label
    from s join public.lobbying_client_tickers t on t.client_name = s.client_name
    where p_by <> 'firm' and s.key in (select key from top)
    order by s.key, t.verified desc nulls last, t.ticker
  )
  select jsonb_build_object(
    'totalSpend', (select coalesce(sum(amount), 0) from s),
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
        'key', top.key, 'name', top.name, 'spend', top.spend, 'filings', top.filings,
        'ticker', tick.ticker, 'verified', coalesce(tick.verified, false), 'company', tick.company_label)
        order by top.spend desc)
      from top left join tick on tick.key = top.key), '[]'::jsonb)
  );
$$;

create or replace function public.lobbying_page_pressure(p jsonb)
returns jsonb
language sql
stable
set search_path to 'public'
set work_mem to '16MB'
as $$
  with s as materialized (select client_name, issue_codes, entity_names from public.lobbying_page_scope(p)),
  ti as materialized (
    select c as code, count(*) as filings from s, unnest(s.issue_codes) c
    group by c order by filings desc, c limit 12
  ),
  te as materialized (
    select e as entity, count(*) as filings from s, unnest(s.entity_names) e
    group by e order by filings desc, e limit 10
  ),
  pair as materialized (
    select c as code, e as entity, s.client_name
    from s, unnest(s.issue_codes) c, unnest(s.entity_names) e
    where c in (select code from ti) and e in (select entity from te)
  ),
  cell as materialized (select code, entity, count(*) as n from pair group by code, entity),
  cl as (
    select code, entity, client_name,
           row_number() over (partition by code, entity order by count(*) desc, client_name) as rk
    from pair where client_name is not null
    group by code, entity, client_name
  ),
  -- Top three clients per cell in one grouped pass (not a lookup per cell).
  top3 as materialized (
    select code, entity, jsonb_agg(client_name order by rk) as clients
    from cl where rk <= 3 group by code, entity
  )
  select jsonb_build_object(
    'total', (select count(*) from s),
    'issues', coalesce((select jsonb_agg(jsonb_build_object('code', ti.code, 'label', coalesce(l.label, ti.code), 'filings', ti.filings)
                                         order by ti.filings desc, ti.code)
                        from ti left join public.lobbying_page_issue_label l on l.code = ti.code), '[]'::jsonb),
    'entities', coalesce((select jsonb_agg(jsonb_build_object('name', entity, 'filings', filings) order by filings desc, entity) from te), '[]'::jsonb),
    'cells', coalesce((select jsonb_agg(jsonb_build_object(
        'issue', c.code, 'entity', c.entity, 'filings', c.n, 'topClients', coalesce(t3.clients, '[]'::jsonb))
        order by c.code, c.entity)
      from cell c left join top3 t3 on t3.code = c.code and t3.entity = c.entity), '[]'::jsonb)
  );
$$;

create or replace function public.lobbying_page_rhythm(p jsonb)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'year', year, 'quarter', quarter, 'filings', filings, 'spend', spend)
      order by year, quarter), '[]'::jsonb)
  from (
    select f.year, f.quarter, count(*) as filings,
           coalesce(sum(f.amount) filter (where f.paid), 0) as spend
    from public.lobbying_page_scope(p - 'year' - 'quarters' - 'from' - 'to') f
    where f.year >= 2024 and f.quarter in ('q1', 'q2', 'q3', 'q4')
    group by f.year, f.quarter
  ) q;
$$;

create or replace function public.lobbying_page_door(p jsonb, p_limit int default 8)
returns jsonb
language sql
stable
set search_path to 'public'
set work_mem to '16MB'
as $$
  with s as materialized (
    select firm_name, firm_key, door_names, door_positions from public.lobbying_page_scope(p)
  ),
  dl as materialized (
    select s.firm_name, s.firm_key, d as name
    from s, unnest(s.door_names) d
  ),
  firm as materialized (
    select firm_key as key, mode() within group (order by firm_name) as name, count(distinct name) as lobbyists
    from dl where firm_name is not null
    group by 1
    order by lobbyists desc, name
    limit greatest(least(p_limit, 20), 1)
  ),
  pos as materialized (
    select key, name, position, row_number() over (partition by key order by name, position) as rk
    from (
      select distinct s.firm_key as key, x ->> 'name' as name, x ->> 'position' as position
      from s cross join lateral jsonb_array_elements(coalesce(s.door_positions, '[]'::jsonb)) x
      where s.firm_key in (select key from firm)
    ) d
  )
  select jsonb_build_object(
    'filings', (select count(*) from s),
    'doorFilings', (select count(*) from s where cardinality(s.door_names) > 0),
    'lobbyists', (select count(distinct name) from dl),
    'firms', coalesce((select jsonb_agg(jsonb_build_object(
        'key', f.key, 'name', f.name, 'lobbyists', f.lobbyists,
        'positions', coalesce((select jsonb_agg(jsonb_build_object('name', pos.name, 'position', pos.position) order by pos.rk)
                               from pos where pos.key = f.key and pos.rk <= 5), '[]'::jsonb))
        order by f.lobbyists desc, f.name) from firm f), '[]'::jsonb)
  );
$$;

create or replace function public.lobbying_page_lens(p jsonb, p_limit int default 8)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  with s as materialized (
    select f.uuid, f.amount, f.paid, f.issue_codes, t.ticker, t.verified, t.company_label, t.exchange
    from public.lobbying_page_scope(p) f
    join public.lobbying_client_tickers t on t.client_name = f.client_name
  ),
  grp as (
    select ticker,
           bool_and(coalesce(verified, false)) as verified,
           min(company_label) as company,
           min(exchange) as exchange,
           count(*) as filings,
           coalesce(sum(amount) filter (where paid), 0) as spend
    from s group by ticker
  ),
  top as materialized (select * from grp where spend > 0 order by spend desc limit greatest(least(p_limit, 24), 1)),
  iss as materialized (
    select s.ticker, coalesce(l.label, c) as label,
           row_number() over (partition by s.ticker order by count(*) desc, coalesce(l.label, c)) as rk
    from s cross join lateral unnest(s.issue_codes) c
    left join public.lobbying_page_issue_label l on l.code = c
    where s.ticker in (select ticker from top)
    group by s.ticker, c, l.label
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'ticker', top.ticker, 'company', top.company, 'exchange', top.exchange, 'verified', top.verified,
      'filings', top.filings, 'spend', top.spend,
      'topIssue', (select label from iss where iss.ticker = top.ticker and rk = 1))
      order by top.spend desc), '[]'::jsonb)
  from top;
$$;

create or replace function public.lobbying_page_filings(p jsonb, p_sort text default 'recent', p_limit int default 25, p_offset int default 0)
returns jsonb
language sql
stable
set search_path to 'public'
set work_mem to '16MB'
as $$
  with s as materialized (select uuid, posted, amount from public.lobbying_page_scope(p)),
  ids as materialized (
    select s.uuid from s
    order by case when p_sort = 'amount' then s.amount end desc nulls last, s.posted desc nulls last, s.uuid
    limit greatest(least(p_limit, 500), 1) offset greatest(p_offset, 0)
  ),
  page as materialized (
    select f.uuid, f.dt_posted, f.amount, f.is_registration, f.filing_type, f.client_name, f.registrant_name,
           f.issues, f.lobbyist_count, f.filing_year, f.quarter, f.document_url
    from public.lobbying_filings f where f.uuid in (select uuid from ids)
  )
  select jsonb_build_object(
    'count', (select count(*) from s),
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
        'uuid', pg.uuid, 'posted', pg.dt_posted,
        'amount', case when pg.amount > 0 and coalesce(pg.is_registration, false) = false then pg.amount end,
        'isRegistration', coalesce(pg.is_registration, false), 'type', pg.filing_type,
        'client', pg.client_name, 'firm', pg.registrant_name,
        'issues', coalesce((select jsonb_agg(coalesce(i ->> 'display', i ->> 'code'))
                            from jsonb_array_elements(case when jsonb_typeof(pg.issues) = 'array' then pg.issues else '[]'::jsonb end) i), '[]'::jsonb),
        'lobbyists', coalesce(pg.lobbyist_count, 0), 'year', pg.filing_year, 'quarter', pg.quarter,
        'url', pg.document_url, 'ticker', t.ticker, 'verified', coalesce(t.verified, false))
        order by case when p_sort = 'amount' then pg.amount end desc nulls last, pg.dt_posted desc nulls last, pg.uuid)
      from page pg left join public.lobbying_client_tickers t on t.client_name = pg.client_name), '[]'::jsonb)
  );
$$;

create or replace function public.lobbying_page_entity(p jsonb, p_kind text, p_value text)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  -- One branch per kind: each branch's p_kind test is a one-time filter and
  -- each uses its own index (client_name, firm_key, client_key).
  with matches as materialized (
    select f.* from public.lobbying_page_fact f
    where p_kind = 'ticker' and f.year >= 2024
      and f.client_name in (select t.client_name from public.lobbying_client_tickers t where t.ticker = upper(p_value))
    union all
    select f.* from public.lobbying_page_fact f
    where p_kind = 'firm' and f.year >= 2024 and f.firm_key = p_value
    union all
    select f.* from public.lobbying_page_fact f
    where p_kind = 'client' and f.year >= 2024 and f.client_key = p_value
  ),
  scoped as materialized (
    select m.* from matches m where m.uuid in (select uuid from public.lobbying_page_scope(p))
  ),
  series as (
    select year, quarter, count(*) as filings, coalesce(sum(amount) filter (where paid), 0) as spend
    from matches where quarter in ('q1', 'q2', 'q3', 'q4')
    group by year, quarter
  ),
  iss as (
    select coalesce(l.label, c) as label, count(*) as filings
    from scoped cross join lateral unnest(scoped.issue_codes) c
    left join public.lobbying_page_issue_label l on l.code = c
    group by 1 order by filings desc, label limit 8
  ),
  counter as (
    select case when p_kind = 'firm' then client_name else firm_name end as name,
           count(*) as filings,
           coalesce(sum(amount) filter (where paid), 0) as spend
    from scoped
    where (case when p_kind = 'firm' then client_name else firm_name end) is not null
    group by 1
    order by spend desc, filings desc, name limit 8
  ),
  largest as (
    select uuid, posted, amount, client_name, firm_name, year, quarter
    from scoped where paid
    order by amount desc, posted desc, uuid limit 6
  )
  select jsonb_build_object(
    'name', (select mode() within group (order by case when p_kind = 'firm' then firm_name else client_name end) from matches),
    'verified', (select bool_and(coalesce(t.verified, false)) from public.lobbying_client_tickers t
                 where p_kind = 'ticker' and t.ticker = upper(p_value)),
    'filings', (select count(*) from scoped),
    'spend', (select coalesce(sum(amount) filter (where paid), 0) from scoped),
    'series', coalesce((select jsonb_agg(jsonb_build_object('year', year, 'quarter', quarter, 'filings', filings, 'spend', spend) order by year, quarter) from series), '[]'::jsonb),
    'issues', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'filings', filings) order by filings desc, label) from iss), '[]'::jsonb),
    'counterparties', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'filings', filings, 'spend', spend) order by spend desc, filings desc, name) from counter), '[]'::jsonb),
    'largest', coalesce((select jsonb_agg(jsonb_build_object('uuid', uuid, 'posted', posted, 'amount', amount, 'client', client_name, 'firm', firm_name, 'year', year, 'quarter', quarter) order by amount desc, posted desc, uuid) from largest), '[]'::jsonb)
  );
$$;

create or replace function public.lobbying_page_members(p jsonb, p_limit int default 6)
returns jsonb
language sql
stable
set search_path to 'public'
set work_mem to '32MB'
as $$
  with r as materialized (
    select rep.filing_year, rep.filing_period from public.lobbying_contribution_reports rep
    where (p ->> 'year' is null or rep.filing_year = (p ->> 'year')::int)
      and (jsonb_typeof(p -> 'periods') is distinct from 'array'
           or rep.filing_period = any (array(select jsonb_array_elements_text(p -> 'periods'))))
      and (p ->> 'from' is null or rep.dt_posted >= (p ->> 'from')::timestamptz)
  ),
  base as materialized (
    select c.* from public.lobbying_page_contrib_fact c
    where (p ->> 'year' is null or c.year = (p ->> 'year')::int)
      and (jsonb_typeof(p -> 'periods') is distinct from 'array'
           or c.period = any (array(select jsonb_array_elements_text(p -> 'periods'))))
      and (p ->> 'from' is null or c.posted >= (p ->> 'from')::timestamptz)
      and (coalesce((p ->> 'min')::numeric, 0) <= 0 or c.amount >= (p ->> 'min')::numeric)
  ),
  it as materialized (
    select * from base
    where jsonb_typeof(p -> 'types') is distinct from 'array'
       or type = any (array(select jsonb_array_elements_text(p -> 'types')))
  ),
  hon as (
    select honoree as name, sum(amount) as amount, count(*) as items
    from it where honoree_named group by honoree
    order by amount desc, name limit greatest(least(p_limit, 25), 1)
  ),
  pay as (
    select payee as name, sum(amount) as amount, count(*) as items
    from it where payee_named group by payee
    order by amount desc, name limit greatest(least(p_limit, 25), 1)
  ),
  big as (
    select contributor, payee, honoree, amount, date, type, year, period
    from it order by amount desc, date desc nulls last limit greatest(least(p_limit, 25), 1)
  )
  select jsonb_build_object(
    'total', (select coalesce(sum(amount), 0) from it),
    'items', (select count(*) from it),
    'reports', (select count(*) from r),
    'periods', coalesce((select jsonb_agg(distinct jsonb_build_object('year', filing_year, 'period', filing_period)) from r), '[]'::jsonb),
    'typeCounts', coalesce((select jsonb_object_agg(type, n) from (select type, count(*) as n from base where type is not null group by 1) tc), '{}'::jsonb),
    'honorees', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'amount', amount, 'items', items) order by amount desc, name) from hon), '[]'::jsonb),
    'committees', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'amount', amount, 'items', items) order by amount desc, name) from pay), '[]'::jsonb),
    'largest', coalesce((select jsonb_agg(jsonb_build_object(
        'contributor', contributor, 'payee', payee, 'honoree', honoree, 'amount', amount,
        'date', date, 'type', type, 'year', year, 'period', period)
        order by amount desc, date desc nulls last) from big), '[]'::jsonb)
  );
$$;

-- ── 5. schedule the refresh ──────────────────────────────────────────────
-- pg_cron runs as postgres, so the 30s service_role timeout does not apply.
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid) from cron.job
 where jobname in ('lobbying-page-facts', 'lobbying-page-contrib-facts');
select cron.schedule('lobbying-page-facts', '10 * * * *', 'select public.refresh_lobbying_page_facts()');
select cron.schedule('lobbying-page-contrib-facts', '40 * * * *', 'select public.refresh_lobbying_page_contrib_facts()');
