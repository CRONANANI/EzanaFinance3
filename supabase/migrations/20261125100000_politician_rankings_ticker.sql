-- Politician Tracker redesign (Nov 18 2026): the ticker filter.
--
-- politician_rankings_ticker ranks members on ONE ticker's trades only:
-- trades, buys, sells, disclosed volume (sum of range midpoints) and last
-- trade date are recomputed for that ticker within the window, with the
-- same chamber / party / name filters as politician_rankings. Only members
-- who disclosed a trade in the ticker come back (no zero-trade padding).
--
-- congress_ticker_search backs the ticker typeahead: tickers on file in the
-- window whose symbol starts with the typed text, exact match first, then
-- by trade count, with the most common asset name as the company label.
--
-- Counting rules match politician_rankings: buys are purchases, sells are
-- full and partial sales, exchanges count as trades but neither buy nor
-- sell. Tickers are stored upper case; rows with no ticker never match.
--
-- Additive and idempotent: two new read-only functions, nothing existing is
-- altered. Executable by service_role only, like the other tracker RPCs.

create or replace function public.politician_rankings_ticker(
  window_days int default 365,
  p_chamber text default null,
  p_party text default null,
  p_q text default null,
  p_ticker text default null,
  lim int default 600
)
returns table (
  bioguide_id text, full_name text, chamber text, party text, state text, district int,
  photo_url text, trades bigint, buys bigint, sells bigint, disclosed_volume numeric,
  last_trade date, top_tickers text[]
) language sql stable set search_path = public as $$
  with m as (
    select * from public.congress_members cm
    where (p_chamber is null or cm.chamber = lower(p_chamber))
      and (p_party is null or cm.party = upper(p_party))
      and (p_q is null or p_q = ''
           or cm.full_name ilike '%' || p_q || '%'
           or cm.state ilike p_q)
  ),
  t as (
    select ct.* from public.congress_trades ct
    join m on m.bioguide_id = ct.bioguide_id
    where ct.transaction_date >= current_date - window_days
      and ct.ticker = upper(p_ticker)
  ),
  agg as (
    select t.bioguide_id,
      count(*) trades,
      count(*) filter (where t.type = 'purchase') buys,
      count(*) filter (where t.type in ('sale','sale_partial')) sells,
      sum(t.amount_mid) disclosed_volume,
      max(t.transaction_date) last_trade
    from t group by t.bioguide_id
  )
  select m.bioguide_id, m.full_name, m.chamber, m.party, m.state, m.district, m.photo_url,
         a.trades, a.buys, a.sells, coalesce(a.disclosed_volume, 0), a.last_trade,
         array[upper(p_ticker)]
  from agg a
  join m on m.bioguide_id = a.bioguide_id
  where p_ticker is not null and p_ticker <> ''
  order by a.disclosed_volume desc nulls last, a.trades desc, m.full_name
  limit greatest(1, least(lim, 1000));
$$;

create or replace function public.congress_ticker_search(
  p_prefix text default null,
  window_days int default 365,
  lim int default 12
)
returns table (ticker text, trades bigint, members bigint, company text)
language sql stable set search_path = public as $$
  with t as (
    select ct.ticker, ct.bioguide_id, ct.asset_name
    from public.congress_trades ct
    where ct.ticker is not null
      and ct.transaction_date >= current_date - window_days
      and (p_prefix is null or p_prefix = ''
           or left(ct.ticker, length(p_prefix)) = upper(p_prefix))
  ),
  agg as (
    select t.ticker, count(*) trades, count(distinct t.bioguide_id) members,
           mode() within group (order by t.asset_name) company
    from t group by t.ticker
  )
  select agg.ticker, agg.trades, agg.members, agg.company
  from agg
  order by (agg.ticker = upper(coalesce(p_prefix, ''))) desc, agg.trades desc, agg.ticker
  limit greatest(1, least(lim, 50));
$$;

revoke all on function public.politician_rankings_ticker(int, text, text, text, text, int)
  from public, anon, authenticated;
revoke all on function public.congress_ticker_search(text, int, int)
  from public, anon, authenticated;
grant execute on function public.politician_rankings_ticker(int, text, text, text, text, int)
  to service_role;
grant execute on function public.congress_ticker_search(text, int, int)
  to service_role;
