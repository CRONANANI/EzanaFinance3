-- Lobbying Activity page (Oct 21, 2026 redesign): read-only aggregates.
--
-- One filter object drives every card, so every function takes the same
-- jsonb `p` and scopes through lobbying_page_ids(p):
--   year      int        filing_year (omit for a posted-date window)
--   quarters  text[]     'q1'..'q4' (omit for all)
--   from, to  timestamp  dt_posted window [from, to) (the 90-day period)
--   issue     text       LDA issue code, e.g. 'TAX' (the 79-area vocabulary)
--   buckets   text[]     entity buckets (ENTITY_GROUPS in entities.js)
--   min       numeric    minimum reported amount
--   public    boolean    clients in lobbying_client_tickers only
--   q         text       ready-made ILIKE pattern over client and firm names
--
-- Honesty rules carried in SQL:
--   * Dollars only from non-registration filings with amount > 0.
--   * Issue and pressure payloads carry counts, never dollars.
--   * Ticker rows report `verified` so name matches stay distinguishable.
--
-- Read-only, STABLE, callable by service_role only (the API routes use the
-- admin client), matching hub_lobbying_award_ratio.

-- ── scope ────────────────────────────────────────────────────────────────
-- Returns the uuids of the filings in scope. PL/pgSQL so that only the
-- active filters reach the planner and the existing indexes are used (an
-- "x is null or col = x" predicate forces a full scan: 4.4s for one year in
-- testing, 0.6s this way). Every value is a bound parameter, never spliced.
-- Views join back to lobbying_filings for the columns they need, so the
-- materialised set stays one text column wide.
create or replace function public.lobbying_page_ids(p jsonb)
returns setof text
language plpgsql
stable
set search_path to 'public'
as $$
declare
  v_sql text := 'select f.uuid from public.lobbying_filings f where true';
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
  if v_year is not null then v_sql := v_sql || ' and f.filing_year = $1'; end if;
  if v_quarters is not null then v_sql := v_sql || ' and f.quarter = any ($2)'; end if;
  if v_from is not null then v_sql := v_sql || ' and f.dt_posted >= $3'; end if;
  if v_to is not null then v_sql := v_sql || ' and f.dt_posted < $4'; end if;
  if v_issue is not null then
    v_sql := v_sql || ' and f.issues @> jsonb_build_array(jsonb_build_object(''code'', $5))';
  end if;
  if v_buckets is not null then v_sql := v_sql || ' and f.entity_buckets && $6'; end if;
  if v_min > 0 then v_sql := v_sql || ' and f.amount >= $7'; end if;
  if v_public then
    v_sql := v_sql || ' and f.client_name in (select t.client_name from public.lobbying_client_tickers t)';
  end if;
  if v_q is not null then v_sql := v_sql || ' and (f.client_name ilike $8 or f.registrant_name ilike $8)'; end if;
  return query execute v_sql using v_year, v_quarters, v_from, v_to, v_issue, v_buckets, v_min, v_q;
end
$$;

-- A filing's government entities as plain text, whatever the stored shape.
create or replace function public.lobbying_entity_names(e jsonb)
returns setof text
language sql
immutable
set search_path to 'public'
as $$
  select nullif(btrim(case jsonb_typeof(x)
           when 'string' then x #>> '{}'
           else coalesce(x ->> 'name', x ->> 'government_entity')
         end), '')
  from jsonb_array_elements(case when jsonb_typeof(e) = 'array' then e else '[]'::jsonb end) x;
$$;

-- ── 1. Influence Pulse ───────────────────────────────────────────────────
create or replace function public.lobbying_page_pulse(p jsonb)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  with s as materialized (
    select f.amount, f.is_registration, f.client_name, f.registrant_name, f.lobbyists, f.dt_posted
    from public.lobbying_filings f where f.uuid in (select public.lobbying_page_ids(p))
  ),
  door as (
    select distinct l ->> 'name' as name
    from s, jsonb_array_elements(case when jsonb_typeof(s.lobbyists) = 'array' then s.lobbyists else '[]'::jsonb end) l
    where coalesce((l ->> 'revolvingDoor')::boolean, false) and l ->> 'name' is not null
  )
  select jsonb_build_object(
    'filings', (select count(*) from s),
    'paidFilings', (select count(*) from s where s.amount > 0 and coalesce(s.is_registration, false) = false),
    'spend', (select coalesce(sum(s.amount), 0) from s where s.amount > 0 and coalesce(s.is_registration, false) = false),
    'clients', (select count(distinct public.lobby_norm_name(s.client_name)) from s where s.client_name is not null),
    'firms', (select count(distinct public.lobby_norm_name(s.registrant_name)) from s where s.registrant_name is not null),
    'doorLobbyists', (select count(*) from door),
    'latestPosted', (select max(s.dt_posted) from s)
  );
$$;

-- ── 2. Issues: every issue area with its filing count (chips + landscape) ─
create or replace function public.lobbying_page_issues(p jsonb)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  with s as materialized (select f.uuid, f.issues from public.lobbying_filings f where f.uuid in (select public.lobbying_page_ids(p))),
  per as (
    select distinct s.uuid, i ->> 'code' as code, coalesce(i ->> 'display', i ->> 'code') as label
    from s, jsonb_array_elements(case when jsonb_typeof(s.issues) = 'array' then s.issues else '[]'::jsonb end) i
    where i ->> 'code' is not null
  ),
  agg as (
    select code, min(label) as label, count(distinct uuid) as filings
    from per group by code
  )
  select jsonb_build_object(
    'total', (select count(*) from s),
    'issues', coalesce((select jsonb_agg(jsonb_build_object('code', code, 'label', label, 'filings', filings)
                                         order by filings desc, label) from agg), '[]'::jsonb)
  );
$$;

-- ── 3. Spend Leaderboard ─────────────────────────────────────────────────
create or replace function public.lobbying_page_leaders(p jsonb, p_by text default 'client', p_limit int default 15)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  with s as materialized (
    select case when p_by = 'firm' then f.registrant_name else f.client_name end as raw, f.client_name, f.amount
    from public.lobbying_filings f
    where f.uuid in (select public.lobbying_page_ids(p))
      and f.amount > 0 and coalesce(f.is_registration, false) = false
  ),
  keyed as materialized (select public.lobby_norm_name(raw) as key, raw, client_name, amount from s where raw is not null),
  grp as (
    select key, mode() within group (order by raw) as name, sum(amount) as spend, count(*) as filings
    from keyed where key <> '' group by key
  ),
  top as (select * from grp order by spend desc limit greatest(least(p_limit, 50), 1)),
  tick as (
    select distinct on (k.key) k.key, t.ticker, t.verified, t.company_label
    from keyed k join public.lobbying_client_tickers t on t.client_name = k.client_name
    where p_by <> 'firm' and k.key in (select key from top)
    order by k.key, t.verified desc nulls last, t.ticker
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

-- ── 4. Pressure Map: top issues x top government bodies, filing counts ───
create or replace function public.lobbying_page_pressure(p jsonb)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  with s as materialized (select f.uuid, f.client_name, f.issues, f.entities from public.lobbying_filings f where f.uuid in (select public.lobbying_page_ids(p))),
  fi as materialized (
    select distinct s.uuid, i ->> 'code' as code, coalesce(i ->> 'display', i ->> 'code') as label
    from s, jsonb_array_elements(case when jsonb_typeof(s.issues) = 'array' then s.issues else '[]'::jsonb end) i
    where i ->> 'code' is not null
  ),
  fe as materialized (
    select distinct s.uuid, n as entity
    from s, public.lobbying_entity_names(s.entities) n
    where n is not null
  ),
  ti as (select code, min(label) as label, count(*) as filings from fi group by code order by filings desc, code limit 12),
  te as (select entity, count(*) as filings from fe group by entity order by filings desc, entity limit 10),
  pair as materialized (
    select fi.code, fe.entity, fi.uuid
    from fi join fe on fe.uuid = fi.uuid
    where fi.code in (select code from ti) and fe.entity in (select entity from te)
  ),
  cell as (select code, entity, count(*) as n from pair group by code, entity),
  cl as materialized (
    select pair.code, pair.entity, s.client_name, count(*) as n,
           row_number() over (partition by pair.code, pair.entity order by count(*) desc, s.client_name) as rk
    from pair join s on s.uuid = pair.uuid
    where s.client_name is not null
    group by pair.code, pair.entity, s.client_name
  )
  select jsonb_build_object(
    'total', (select count(*) from s),
    'issues', coalesce((select jsonb_agg(jsonb_build_object('code', code, 'label', label, 'filings', filings) order by filings desc, code) from ti), '[]'::jsonb),
    'entities', coalesce((select jsonb_agg(jsonb_build_object('name', entity, 'filings', filings) order by filings desc, entity) from te), '[]'::jsonb),
    'cells', coalesce((select jsonb_agg(jsonb_build_object(
        'issue', c.code, 'entity', c.entity, 'filings', c.n,
        'topClients', coalesce((select jsonb_agg(cl.client_name order by cl.rk) from cl
                                where cl.code = c.code and cl.entity = c.entity and cl.rk <= 3), '[]'::jsonb)))
      from cell c), '[]'::jsonb)
  );
$$;

-- ── 5. Quarterly Rhythm: spend and filings per quarter, 2024 onward ──────
-- Callers pass p WITHOUT year/quarters/from/to: the rhythm is the time axis.
create or replace function public.lobbying_page_rhythm(p jsonb)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  with s as materialized (
    select f.filing_year, f.quarter, f.amount, f.is_registration
    from public.lobbying_filings f
    where f.uuid in (select public.lobbying_page_ids(p - 'year' - 'quarters' - 'from' - 'to'))
      and f.filing_year >= 2024 and f.quarter in ('q1', 'q2', 'q3', 'q4')
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'year', filing_year, 'quarter', quarter, 'filings', filings, 'spend', spend)
      order by filing_year, quarter), '[]'::jsonb)
  from (
    select filing_year, quarter, count(*) as filings,
           coalesce(sum(amount) filter (where amount > 0 and coalesce(is_registration, false) = false), 0) as spend
    from s group by filing_year, quarter
  ) q;
$$;

-- ── 6. Revolving Door: share of filings, firms by former officials ───────
create or replace function public.lobbying_page_door(p jsonb, p_limit int default 8)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  with s as materialized (select f.uuid, f.registrant_name, f.lobbyists from public.lobbying_filings f where f.uuid in (select public.lobbying_page_ids(p))),
  dl as materialized (
    select s.uuid, s.registrant_name, l ->> 'name' as name, nullif(btrim(l ->> 'coveredPosition'), '') as position
    from s, jsonb_array_elements(case when jsonb_typeof(s.lobbyists) = 'array' then s.lobbyists else '[]'::jsonb end) l
    where coalesce((l ->> 'revolvingDoor')::boolean, false) and l ->> 'name' is not null
  ),
  firm as (
    select public.lobby_norm_name(registrant_name) as key,
           mode() within group (order by registrant_name) as name,
           count(distinct dl.name) as lobbyists
    from dl where registrant_name is not null
    group by 1
    order by lobbyists desc, name
    limit greatest(least(p_limit, 20), 1)
  ),
  pos as materialized (
    select key, name, position,
           row_number() over (partition by key order by name) as rk
    from (
      select distinct public.lobby_norm_name(dl.registrant_name) as key, dl.name, dl.position
      from dl
    ) d
    where key in (select key from firm) and position is not null
  )
  select jsonb_build_object(
    'filings', (select count(*) from s),
    'doorFilings', (select count(distinct uuid) from dl),
    'lobbyists', (select count(distinct name) from dl),
    'firms', coalesce((select jsonb_agg(jsonb_build_object(
        'key', f.key, 'name', f.name, 'lobbyists', f.lobbyists,
        'positions', coalesce((select jsonb_agg(jsonb_build_object('name', pos.name, 'position', pos.position) order by pos.rk)
                               from pos where pos.key = f.key and pos.rk <= 5), '[]'::jsonb))
        order by f.lobbyists desc, f.name) from firm f), '[]'::jsonb)
  );
$$;

-- ── 7. Public Company Lens: public clients grouped by ticker ─────────────
create or replace function public.lobbying_page_lens(p jsonb, p_limit int default 8)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  with s as materialized (
    select f.uuid, f.amount, f.is_registration, f.issues, t.ticker, t.verified, t.company_label, t.exchange
    from public.lobbying_filings f
    join public.lobbying_client_tickers t on t.client_name = f.client_name
    where f.uuid in (select public.lobbying_page_ids(p))
  ),
  grp as (
    select ticker,
           bool_and(coalesce(verified, false)) as verified,
           min(company_label) as company,
           min(exchange) as exchange,
           count(*) as filings,
           coalesce(sum(amount) filter (where amount > 0 and coalesce(is_registration, false) = false), 0) as spend
    from s group by ticker
  ),
  top as (select * from grp where spend > 0 order by spend desc limit greatest(least(p_limit, 24), 1)),
  iss as materialized (
    select s.ticker, coalesce(i ->> 'display', i ->> 'code') as label, count(*) as n,
           row_number() over (partition by s.ticker order by count(*) desc, coalesce(i ->> 'display', i ->> 'code')) as rk
    from s, jsonb_array_elements(case when jsonb_typeof(s.issues) = 'array' then s.issues else '[]'::jsonb end) i
    where s.ticker in (select ticker from top)
    group by s.ticker, 2
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'ticker', top.ticker, 'company', top.company, 'exchange', top.exchange, 'verified', top.verified,
      'filings', top.filings, 'spend', top.spend,
      'topIssue', (select label from iss where iss.ticker = top.ticker and rk = 1))
      order by top.spend desc), '[]'::jsonb)
  from top;
$$;

-- ── 8. Disclosures table ─────────────────────────────────────────────────
create or replace function public.lobbying_page_filings(p jsonb, p_sort text default 'recent', p_limit int default 25, p_offset int default 0)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  with ids as materialized (select public.lobbying_page_ids(p) as uuid),
  page as materialized (
    select f.uuid, f.dt_posted, f.amount, f.is_registration, f.filing_type, f.client_name, f.registrant_name,
           f.issues, f.lobbyist_count, f.filing_year, f.quarter, f.document_url
    from public.lobbying_filings f
    where f.uuid in (select uuid from ids)
    order by
      case when p_sort = 'amount' then f.amount end desc nulls last,
      f.dt_posted desc nulls last,
      f.uuid
    limit greatest(least(p_limit, 500), 1) offset greatest(p_offset, 0)
  )
  select jsonb_build_object(
    'count', (select count(*) from ids),
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

-- ── 9. One entity in depth: the client drawer and the company modal ──────
-- p_kind: 'client' | 'firm' (p_value = lobby_norm_name key) | 'ticker'.
-- The quarter series ignores the page period (it is the time axis); issues,
-- firms and largest filings respect p.
create or replace function public.lobbying_page_entity(p jsonb, p_kind text, p_value text)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  -- One branch per kind (not a CASE): each branch's p_kind test is a
  -- one-time filter, and the ticker branch keeps its hashed IN list.
  with matches as materialized (
    select f.* from public.lobbying_filings f
    where p_kind = 'ticker' and f.filing_year >= 2024
      and f.client_name in (select t.client_name from public.lobbying_client_tickers t where t.ticker = upper(p_value))
    union all
    select f.* from public.lobbying_filings f
    where p_kind = 'firm' and f.filing_year >= 2024 and public.lobby_norm_name(f.registrant_name) = p_value
    union all
    select f.* from public.lobbying_filings f
    where p_kind = 'client' and f.filing_year >= 2024 and public.lobby_norm_name(f.client_name) = p_value
  ),
  scoped as materialized (
    select m.* from matches m
    where m.uuid in (select public.lobbying_page_ids(p))
  ),
  series as (
    select filing_year, quarter, count(*) as filings,
           coalesce(sum(amount) filter (where amount > 0 and coalesce(is_registration, false) = false), 0) as spend
    from matches where quarter in ('q1', 'q2', 'q3', 'q4')
    group by filing_year, quarter
  ),
  iss as (
    select coalesce(i ->> 'display', i ->> 'code') as label, count(*) as filings
    from scoped, jsonb_array_elements(case when jsonb_typeof(scoped.issues) = 'array' then scoped.issues else '[]'::jsonb end) i
    group by 1 order by filings desc, label limit 8
  ),
  counter as (
    select case when p_kind = 'firm' then client_name else registrant_name end as name,
           count(*) as filings,
           coalesce(sum(amount) filter (where amount > 0 and coalesce(is_registration, false) = false), 0) as spend
    from scoped
    where (case when p_kind = 'firm' then client_name else registrant_name end) is not null
    group by 1
    order by spend desc, filings desc limit 8
  ),
  largest as (
    select uuid, dt_posted, amount, client_name, registrant_name, filing_year, quarter
    from scoped where amount > 0 and coalesce(is_registration, false) = false
    order by amount desc, dt_posted desc limit 6
  )
  select jsonb_build_object(
    'name', (select mode() within group (order by case when p_kind = 'firm' then registrant_name else client_name end) from matches),
    'verified', (select bool_and(coalesce(t.verified, false)) from public.lobbying_client_tickers t
                 where p_kind = 'ticker' and t.ticker = upper(p_value)),
    'filings', (select count(*) from scoped),
    'spend', (select coalesce(sum(amount) filter (where amount > 0 and coalesce(is_registration, false) = false), 0) from scoped),
    'series', coalesce((select jsonb_agg(jsonb_build_object('year', filing_year, 'quarter', quarter, 'filings', filings, 'spend', spend) order by filing_year, quarter) from series), '[]'::jsonb),
    'issues', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'filings', filings) order by filings desc, label) from iss), '[]'::jsonb),
    'counterparties', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'filings', filings, 'spend', spend) order by spend desc, filings desc) from counter), '[]'::jsonb),
    'largest', coalesce((select jsonb_agg(jsonb_build_object('uuid', uuid, 'posted', dt_posted, 'amount', amount, 'client', client_name, 'firm', registrant_name, 'year', filing_year, 'quarter', quarter) order by amount desc, dt_posted desc) from largest), '[]'::jsonb)
  );
$$;

-- A name worth ranking: not empty and not a filer placeholder such as "N/A"
-- (1,039 FECA items in 2025 name "N/A" as the honoree). Placeholder items
-- still count toward totals; they are only kept out of the rankings.
create or replace function public.lobbying_named(v text)
returns boolean
language sql
immutable
set search_path to 'public'
as $$
  select v is not null
     and btrim(v) <> ''
     and upper(btrim(v)) !~ '^(N/?A|NONE|NOT APPLICABLE|UNKNOWN|-+|\.+)$';
$$;

-- ── 10. Money to Members (LD-203) ────────────────────────────────────────
-- p: year int, periods text[] ('mid_year'|'year_end'), from timestamp (on
-- report dt_posted), types text[] (feca|he|me|ple|pic), min numeric.
-- Type counts ignore the type filter so every chip shows its count.
create or replace function public.lobbying_page_members(p jsonb, p_limit int default 6)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  with r as materialized (
    select rep.* from public.lobbying_contribution_reports rep
    where (p ->> 'year' is null or rep.filing_year = (p ->> 'year')::int)
      and (jsonb_typeof(p -> 'periods') is distinct from 'array'
           or rep.filing_period = any (array(select jsonb_array_elements_text(p -> 'periods'))))
      and (p ->> 'from' is null or rep.dt_posted >= (p ->> 'from')::timestamptz)
  ),
  base as materialized (
    select i.*, r.filing_year, r.filing_period
    from public.lobbying_contribution_items i join r on r.filing_uuid = i.filing_uuid
    where i.amount > 0
      and (coalesce((p ->> 'min')::numeric, 0) <= 0 or i.amount >= (p ->> 'min')::numeric)
  ),
  it as materialized (
    select * from base
    where jsonb_typeof(p -> 'types') is distinct from 'array'
       or contribution_type = any (array(select jsonb_array_elements_text(p -> 'types')))
  ),
  hon as (
    select honoree_name as name, sum(amount) as amount, count(*) as items
    from it where public.lobbying_named(honoree_name) group by honoree_name
    order by amount desc, name limit greatest(least(p_limit, 25), 1)
  ),
  pay as (
    select payee_name as name, sum(amount) as amount, count(*) as items
    from it where public.lobbying_named(payee_name) group by payee_name
    order by amount desc, name limit greatest(least(p_limit, 25), 1)
  ),
  big as (
    select contributor_name, payee_name, honoree_name, amount, contribution_date, contribution_type, filing_year, filing_period
    from it order by amount desc, contribution_date desc nulls last limit greatest(least(p_limit, 25), 1)
  )
  select jsonb_build_object(
    'total', (select coalesce(sum(amount), 0) from it),
    'items', (select count(*) from it),
    'reports', (select count(*) from r),
    'periods', coalesce((select jsonb_agg(distinct jsonb_build_object('year', filing_year, 'period', filing_period)) from r), '[]'::jsonb),
    'typeCounts', coalesce((select jsonb_object_agg(contribution_type, n) from (select contribution_type, count(*) as n from base where contribution_type is not null group by 1) tc), '{}'::jsonb),
    'honorees', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'amount', amount, 'items', items) order by amount desc, name) from hon), '[]'::jsonb),
    'committees', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'amount', amount, 'items', items) order by amount desc, name) from pay), '[]'::jsonb),
    'largest', coalesce((select jsonb_agg(jsonb_build_object(
        'contributor', contributor_name, 'payee', payee_name, 'honoree', honoree_name, 'amount', amount,
        'date', contribution_date, 'type', contribution_type, 'year', filing_year, 'period', filing_period)
        order by amount desc, contribution_date desc nulls last) from big), '[]'::jsonb)
  );
$$;

-- ── grants: service_role only, like hub_lobbying_award_ratio ─────────────
revoke all on function public.lobbying_page_ids(jsonb) from public, anon, authenticated;
revoke all on function public.lobbying_entity_names(jsonb) from public, anon, authenticated;
revoke all on function public.lobbying_named(text) from public, anon, authenticated;
revoke all on function public.lobbying_page_pulse(jsonb) from public, anon, authenticated;
revoke all on function public.lobbying_page_issues(jsonb) from public, anon, authenticated;
revoke all on function public.lobbying_page_leaders(jsonb, text, int) from public, anon, authenticated;
revoke all on function public.lobbying_page_pressure(jsonb) from public, anon, authenticated;
revoke all on function public.lobbying_page_rhythm(jsonb) from public, anon, authenticated;
revoke all on function public.lobbying_page_door(jsonb, int) from public, anon, authenticated;
revoke all on function public.lobbying_page_lens(jsonb, int) from public, anon, authenticated;
revoke all on function public.lobbying_page_filings(jsonb, text, int, int) from public, anon, authenticated;
revoke all on function public.lobbying_page_entity(jsonb, text, text) from public, anon, authenticated;
revoke all on function public.lobbying_page_members(jsonb, int) from public, anon, authenticated;
grant execute on function public.lobbying_page_ids(jsonb) to service_role;
grant execute on function public.lobbying_entity_names(jsonb) to service_role;
grant execute on function public.lobbying_named(text) to service_role;
grant execute on function public.lobbying_page_pulse(jsonb) to service_role;
grant execute on function public.lobbying_page_issues(jsonb) to service_role;
grant execute on function public.lobbying_page_leaders(jsonb, text, int) to service_role;
grant execute on function public.lobbying_page_pressure(jsonb) to service_role;
grant execute on function public.lobbying_page_rhythm(jsonb) to service_role;
grant execute on function public.lobbying_page_door(jsonb, int) to service_role;
grant execute on function public.lobbying_page_lens(jsonb, int) to service_role;
grant execute on function public.lobbying_page_filings(jsonb, text, int, int) to service_role;
grant execute on function public.lobbying_page_entity(jsonb, text, text) to service_role;
grant execute on function public.lobbying_page_members(jsonb, int) to service_role;
