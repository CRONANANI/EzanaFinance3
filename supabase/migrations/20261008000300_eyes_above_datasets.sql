-- 20261008000300_eyes_above_datasets.sql
-- Eyes Above: the four datasets go live.
--   Supply Chain Monitoring   IMF PortWatch daily port calls and chokepoint transits,
--                             NY Fed Global Supply Chain Pressure Index, Cass Freight (FRED)
--   Commercial Real Estate    FRED: CRE prices, CRE loans, delinquency, construction spending
--   Patent Activity           USPTO PatentSearch API (PatentsView): grants by assignee,
--                             matched to tickers with the contractor name matcher
--   Satellite Imagery         NASA Black Marble (VIIRS) monthly night lights per region,
--                             computed by the GitHub Actions worker (worldbank/blackmarblepy)
-- Everything here is public-record or open data: public read, service-role writes.

-- ── shared: ingest checkpoints ─────────────────────────────────────────
create table if not exists public.eyes_ingest_state (
  job         text primary key,
  cursor      text,
  last_ok_at  timestamptz,
  detail      jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ── supply chain: ports and chokepoints (IMF PortWatch) ───────────────
create table if not exists public.eyes_ports (
  portid      text primary key,
  portname    text not null,
  country     text,
  iso3        text,
  lat         double precision,
  lon         double precision,
  calls_12m   integer,
  tracked     boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table if not exists public.eyes_port_activity (
  portid               text not null,
  date                 date not null,
  portcalls            integer,
  portcalls_container  integer,
  portcalls_tanker     integer,
  portcalls_dry_bulk   integer,
  import_tonnes        bigint,
  export_tonnes        bigint,
  primary key (portid, date)
);
create index if not exists eyes_port_activity_date_idx on public.eyes_port_activity (date desc);

create table if not exists public.eyes_chokepoints (
  portid      text primary key,
  portname    text not null,
  lat         double precision,
  lon         double precision,
  updated_at  timestamptz not null default now()
);

create table if not exists public.eyes_chokepoint_transits (
  portid        text not null,
  date          date not null,
  n_total       integer,
  n_container   integer,
  n_tanker      integer,
  n_dry_bulk    integer,
  n_cargo       integer,
  capacity      bigint,
  primary key (portid, date)
);
create index if not exists eyes_chokepoint_transits_date_idx on public.eyes_chokepoint_transits (date desc);

-- ── macro series: FRED and NY Fed (supply chain and CRE) ─────────────
create table if not exists public.eyes_series (
  series_id   text primary key,          -- FRED id, or 'GSCPI'
  source      text not null,             -- 'fred' | 'nyfed'
  dataset     text not null,             -- 'supply' | 'cre'
  title       text not null,
  units       text,
  frequency   text,
  last_date   date,
  synced_at   timestamptz not null default now()
);
create table if not exists public.eyes_series_obs (
  series_id   text not null references public.eyes_series (series_id) on delete cascade,
  date        date not null,
  value       double precision,
  primary key (series_id, date)
);

-- ── patents (USPTO PatentSearch) ──────────────────────────────────────
create table if not exists public.eyes_patents (
  patent_id      text primary key,
  patent_date    date not null,
  title          text,
  assignee       text,
  assignee_key   text,
  ticker         text,
  cpc_section    text,
  filing_date    date,
  synced_at      timestamptz not null default now()
);
create index if not exists eyes_patents_ticker_date_idx on public.eyes_patents (ticker, patent_date desc) where ticker is not null;
create index if not exists eyes_patents_date_idx on public.eyes_patents (patent_date desc);
create index if not exists eyes_patents_assignee_key_idx on public.eyes_patents (assignee_key);

-- Patent holders that file through IP subsidiaries or names the contractor
-- lists do not carry. Matched as a name prefix on the normalised key.
create table if not exists public.eyes_assignee_aliases (
  prefix_key  text primary key,
  ticker      text not null,
  note        text
);
insert into public.eyes_assignee_aliases (prefix_key, ticker, note)
select contractor_name_key(n), t, 'patent assignee alias'
from (values
  ('Apple', 'AAPL'), ('GM Global Technology Operations', 'GM'), ('Ford Global Technologies', 'F'),
  ('Microsoft Technology Licensing', 'MSFT'), ('Amazon Technologies', 'AMZN'),
  ('Capital One Services', 'COF'), ('Bank of America', 'BAC'), ('JPMorgan Chase Bank', 'JPM'),
  ('Honeywell', 'HON'), ('General Electric', 'GE'), ('Lockheed Martin', 'LMT'),
  ('Cisco Technology', 'CSCO'), ('Adobe', 'ADBE'), ('Salesforce', 'CRM'),
  ('Oracle International', 'ORCL'), ('Dell Products', 'DELL'),
  ('Hewlett Packard Enterprise Development', 'HPE'), ('HP Development', 'HPQ'),
  ('Western Digital Technologies', 'WDC'), ('Applied Materials', 'AMAT'), ('Lam Research', 'LRCX'),
  ('Advanced Micro Devices', 'AMD'), ('Tesla', 'TSLA'), ('3M Innovative Properties', 'MMM'),
  ('Caterpillar', 'CAT'), ('Deere', 'DE'), ('AbbVie', 'ABBV'), ('Medtronic', 'MDT'),
  ('Netflix', 'NFLX'), ('Uber Technologies', 'UBER'), ('Visa', 'V'),
  ('Mastercard', 'MA'), ('Walmart Apollo', 'WMT'), ('PayPal', 'PYPL')
) v(n, t)
on conflict (prefix_key) do update set ticker = excluded.ticker;

-- Assignee name to ticker: patent aliases first, then the contract resolver's
-- rules (exact normalised name, then the longest known name prefix).
create or replace function public.eyes_assignee_ticker(p_name text)
returns text
language sql
stable
set search_path to 'public'
as $$
  with k as (select contractor_name_key(p_name) as key)
  select coalesce(
    (select a.ticker from eyes_assignee_aliases a, k
      where k.key <> '' and (k.key = a.prefix_key or k.key like a.prefix_key || ' %')
      order by length(a.prefix_key) desc limit 1),
    (select t.ticker from contractor_tickers t, k
      where t.name_key = k.key and t.is_public is not false and t.ticker is not null limit 1),
    (select p.ticker from contractor_ticker_prefixes p, k
      where k.key <> '' and (k.key = p.prefix_key or k.key like p.prefix_key || ' %')
      order by length(p.prefix_key) desc limit 1)
  );
$$;
grant execute on function public.eyes_assignee_ticker(text) to service_role;

-- Fill assignee_key and ticker for new rows (p_all = false), or re-resolve
-- everything after the name lists change (p_all = true).
drop function if exists public.eyes_resolve_patent_tickers();
create or replace function public.eyes_resolve_patent_tickers(p_all boolean default false)
returns integer
language sql
security definer
set search_path to 'public'
as $$
  with u as (
    update eyes_patents p
       set assignee_key = contractor_name_key(p.assignee),
           ticker = eyes_assignee_ticker(p.assignee)
     where p.assignee is not null
       and (p_all or p.assignee_key is null)
    returning 1
  )
  select count(*)::int from u;
$$;
revoke all on function public.eyes_resolve_patent_tickers(boolean) from public, anon, authenticated;
grant execute on function public.eyes_resolve_patent_tickers(boolean) to service_role;

-- Momentum: grants in the last 12 months against the 12 before, by ticker.
create or replace function public.eyes_patent_momentum(p_limit integer default 50, p_min_grants integer default 10)
returns table(ticker text, assignee text, grants_12m integer, grants_prior_12m integer,
              change_pct numeric, top_cpc text, last_grant date)
language sql
stable
set search_path to 'public'
as $$
  with g as (
    select ticker,
           count(*) filter (where patent_date > current_date - 365)::int as g12,
           count(*) filter (where patent_date <= current_date - 365 and patent_date > current_date - 730)::int as gp,
           mode() within group (order by assignee) as assignee,
           mode() within group (order by cpc_section) filter (where patent_date > current_date - 365) as top_cpc,
           max(patent_date) as last_grant
    from eyes_patents
    where ticker is not null and patent_date > current_date - 730
    group by ticker
  )
  select ticker, assignee, g12, gp,
         case when gp > 0 then round(100.0 * (g12 - gp) / gp, 1) end,
         top_cpc, last_grant
  from g
  where g12 >= greatest(coalesce(p_min_grants, 10), 1)
  order by g12 desc
  limit least(greatest(coalesce(p_limit, 50), 1), 500);
$$;
grant execute on function public.eyes_patent_momentum(integer, integer) to anon, authenticated, service_role;

-- Grants per month for one ticker (the company chart).
create or replace function public.eyes_patent_monthly(p_ticker text, p_months integer default 36)
returns table(month date, grants integer)
language sql
stable
set search_path to 'public'
as $$
  select date_trunc('month', patent_date)::date, count(*)::int
  from eyes_patents
  where ticker = upper(p_ticker)
    and patent_date >= (date_trunc('month', current_date) - make_interval(months => greatest(coalesce(p_months, 36), 1)))::date
  group by 1
  order by 1;
$$;
grant execute on function public.eyes_patent_monthly(text, integer) to anon, authenticated, service_role;

-- ── satellite: night lights (NASA Black Marble VNP46A3, monthly) ──────
create table if not exists public.eyes_regions (
  region_id   text primary key,
  name        text not null,
  kind        text not null,              -- 'metro' | 'port' | 'industrial' | 'energy'
  country     text,
  bbox        double precision[] not null, -- [min_lon, min_lat, max_lon, max_lat]
  note        text,
  updated_at  timestamptz not null default now()
);
create table if not exists public.eyes_night_lights (
  region_id      text not null references public.eyes_regions (region_id) on delete cascade,
  month          date not null,
  mean_radiance  double precision,
  sum_radiance   double precision,
  valid_pixels   integer,
  primary key (region_id, month)
);

-- ── read access ──────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['eyes_assignee_aliases','eyes_ports','eyes_port_activity','eyes_chokepoints','eyes_chokepoint_transits',
                           'eyes_series','eyes_series_obs','eyes_patents','eyes_regions','eyes_night_lights']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'public read ' || t, t);
    execute format('create policy %I on public.%I for select using (true)', 'public read ' || t, t);
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
end $$;
alter table public.eyes_ingest_state enable row level security;   -- server only, no policy

-- ── movers: chokepoints and ports, recent days against the year before ──
-- recent_avg: mean daily transits/calls over the last p_days of data (the
-- data lags, so "last" means the latest dates loaded, not today); base_avg:
-- the 365 days before that window.
create or replace function public.eyes_chokepoint_change(p_days integer default 7)
returns table(portid text, portname text, last_date date, recent_avg numeric, base_avg numeric,
              change_pct numeric, recent_tankers numeric, recent_containers numeric)
language sql
stable
set search_path to 'public'
as $$
  with lastd as (select max(date) as d from eyes_chokepoint_transits),
  w as (
    select t.portid,
           avg(t.n_total) filter (where t.date > l.d - p_days)                                   as recent_avg,
           avg(t.n_total) filter (where t.date <= l.d - p_days and t.date > l.d - p_days - 365)  as base_avg,
           avg(t.n_tanker) filter (where t.date > l.d - p_days)                                  as recent_tankers,
           avg(t.n_container) filter (where t.date > l.d - p_days)                               as recent_containers,
           max(l.d) as last_date
    from eyes_chokepoint_transits t, lastd l
    where t.date > l.d - p_days - 365
    group by t.portid
  )
  select w.portid, c.portname, w.last_date, round(w.recent_avg, 1), round(w.base_avg, 1),
         case when w.base_avg > 0 then round(100 * (w.recent_avg - w.base_avg) / w.base_avg, 1) end,
         round(w.recent_tankers, 1), round(w.recent_containers, 1)
  from w join eyes_chokepoints c using (portid)
  order by abs(coalesce(case when w.base_avg > 0 then (w.recent_avg - w.base_avg) / w.base_avg end, 0)) desc;
$$;
grant execute on function public.eyes_chokepoint_change(integer) to anon, authenticated, service_role;

create or replace function public.eyes_port_change(p_days integer default 28, p_limit integer default 100)
returns table(portid text, portname text, country text, last_date date, recent_avg numeric,
              base_avg numeric, change_pct numeric, recent_import numeric, recent_export numeric)
language sql
stable
set search_path to 'public'
as $$
  with lastd as (select max(date) as d from eyes_port_activity),
  w as (
    select a.portid,
           avg(a.portcalls) filter (where a.date > l.d - p_days)                                  as recent_avg,
           avg(a.portcalls) filter (where a.date <= l.d - p_days and a.date > l.d - p_days - 365) as base_avg,
           avg(a.import_tonnes) filter (where a.date > l.d - p_days)                              as recent_import,
           avg(a.export_tonnes) filter (where a.date > l.d - p_days)                              as recent_export,
           max(l.d) as last_date
    from eyes_port_activity a, lastd l
    where a.date > l.d - p_days - 365
    group by a.portid
  )
  select w.portid, p.portname, p.country, w.last_date, round(w.recent_avg, 1), round(w.base_avg, 1),
         case when w.base_avg > 0 then round(100 * (w.recent_avg - w.base_avg) / w.base_avg, 1) end,
         round(w.recent_import), round(w.recent_export)
  from w join eyes_ports p using (portid)
  where p.tracked
  order by p.calls_12m desc nulls last
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;
grant execute on function public.eyes_port_change(integer, integer) to anon, authenticated, service_role;

-- ── EzanaQL views (Eyes Above catalog) ────────────────────────────────
create or replace view public.ezq_eyes_chokepoints with (security_invoker = true) as
select t.date, c.portname as chokepoint, t.n_total as transits, t.n_tanker as tankers,
       t.n_container as container_ships, t.n_dry_bulk as dry_bulk, t.capacity
from eyes_chokepoint_transits t join eyes_chokepoints c using (portid);

create or replace view public.ezq_eyes_ports with (security_invoker = true) as
select a.date, p.portname as port, p.country, a.portcalls as port_calls,
       a.import_tonnes as imports_tonnes, a.export_tonnes as exports_tonnes
from eyes_port_activity a join eyes_ports p using (portid);

create or replace view public.ezq_eyes_patents with (security_invoker = true) as
select patent_id, patent_date, title, assignee, ticker, cpc_section, filing_date
from eyes_patents;

grant select on public.ezq_eyes_chokepoints, public.ezq_eyes_ports, public.ezq_eyes_patents to anon, authenticated;
