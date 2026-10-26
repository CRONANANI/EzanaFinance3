-- Ezana API, Capitol Watch (Oct 26): the insider-flow signal behind
-- GET /v1/congress/signals/insider-flow, plus two lookup indexes for the
-- lobbying client and registrant endpoints.
--
-- api_congress_insider_flow: per ticker, the distinct members buying and
-- selling over a trade-date window, the estimated dollars on each side
-- (midpoint of the disclosed range), and a flow score from -100 to +100:
-- half member breadth (buyers - sellers) / (buyers + sellers), half dollar
-- flow (buy - sell) / (buy + sell), each scaled to +-50. Only tickers traded
-- by at least p_min_members distinct members.
--
-- p_cutoff is the API key's delay cutoff: the window ends on it (instead of
-- today) and trades disclosed after it are left out. An earlier hand-applied
-- version had no cutoff and five arguments; it is dropped here so PostgREST
-- resolves one function.
--
-- Applied by hand in the Supabase SQL editor. Safe to re-run. SQL bodies are
-- not checked at create time (the test databases lack these tables).

set check_function_bodies = off;

drop function if exists public.api_congress_insider_flow(integer, integer, text, text, integer);

create or replace function public.api_congress_insider_flow(
  p_days integer default 180,
  p_min_members integer default 2,
  p_chamber text default null,
  p_party text default null,
  p_cutoff date default null,
  p_limit integer default 100,
  p_direction text default 'buying'
)
returns table (
  ticker text,
  buyers integer,
  sellers integer,
  buys integer,
  sells integer,
  buy_usd numeric,
  sell_usd numeric,
  flow_score numeric,
  avg_disclosure_lag_days numeric,
  first_trade date,
  last_trade date
)
language sql
stable
set search_path = public
as $fn$
  with bounds as (
    select coalesce(p_cutoff, current_date) as hi,
           greatest(1, least(coalesce(p_days, 180), 1825)) as days
  ),
  t as (
    select upper(ct.ticker) as ticker, ct.bioguide_id, ct.type,
           coalesce(ct.amount_mid, (ct.amount_min + ct.amount_max) / 2.0) as amt,
           ct.transaction_date, ct.disclosure_date
    from public.congress_trades ct
    cross join bounds b
    left join public.congress_members cm on cm.bioguide_id = ct.bioguide_id
    where ct.ticker is not null
      and upper(ct.ticker) ~ '^[A-Z][A-Z0-9.\-]{0,9}$'
      and ct.type in ('purchase', 'sale', 'sale_partial')
      and ct.transaction_date > b.hi - b.days
      and ct.transaction_date <= b.hi
      and (p_cutoff is null or ct.disclosure_date <= p_cutoff)
      and (p_chamber is null or ct.chamber = lower(p_chamber))
      and (p_party is null or cm.party = upper(p_party))
  ),
  agg as (
    select t.ticker,
      count(distinct t.bioguide_id) filter (where t.type = 'purchase')  as buyers,
      count(distinct t.bioguide_id) filter (where t.type <> 'purchase') as sellers,
      count(*) filter (where t.type = 'purchase')                       as buys,
      count(*) filter (where t.type <> 'purchase')                      as sells,
      coalesce(sum(t.amt) filter (where t.type = 'purchase'), 0)        as buy_usd,
      coalesce(sum(t.amt) filter (where t.type <> 'purchase'), 0)       as sell_usd,
      avg(t.disclosure_date - t.transaction_date)                       as lag,
      min(t.transaction_date)                                           as first_trade,
      max(t.transaction_date)                                           as last_trade,
      count(distinct t.bioguide_id)                                     as members
    from t
    group by t.ticker
  ),
  scored as (
    select a.*,
      round(
        ((a.buyers - a.sellers)::numeric / greatest(a.buyers + a.sellers, 1)) * 50
        + (case when a.buy_usd + a.sell_usd > 0
                then (a.buy_usd - a.sell_usd) / (a.buy_usd + a.sell_usd) else 0 end) * 50,
        1) as score
    from agg a
    where a.members >= greatest(1, coalesce(p_min_members, 2))
  )
  select s.ticker, s.buyers::int, s.sellers::int, s.buys::int, s.sells::int,
         round(s.buy_usd), round(s.sell_usd), s.score, round(s.lag, 1),
         s.first_trade, s.last_trade
  from scored s
  order by
    case when lower(coalesce(p_direction, 'buying')) = 'selling' then s.score end asc,
    case when lower(coalesce(p_direction, 'buying')) = 'selling' then s.sellers end desc,
    case when lower(coalesce(p_direction, 'buying')) <> 'selling' then s.score end desc,
    case when lower(coalesce(p_direction, 'buying')) <> 'selling' then s.buyers end desc,
    s.ticker
  limit greatest(1, least(coalesce(p_limit, 100), 200));
$fn$;

revoke all on function public.api_congress_insider_flow(integer, integer, text, text, date, integer, text)
  from public, anon, authenticated;
grant execute on function public.api_congress_insider_flow(integer, integer, text, text, date, integer, text)
  to service_role;

-- /v1/lobbying/clients/{id} and /v1/lobbying/registrants/{id} look filings up
-- by LDA id; without these each lookup scans every filing.
do $idx$
begin
  if to_regclass('public.lobbying_filings') is null then
    raise notice 'lobbying_filings missing; skipping lobbying id indexes';
    return;
  end if;
  execute 'create index if not exists idx_lobbying_client_id on public.lobbying_filings (client_id)';
  execute 'create index if not exists idx_lobbying_registrant_id on public.lobbying_filings (registrant_id)';
end
$idx$;
