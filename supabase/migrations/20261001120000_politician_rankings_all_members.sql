-- Politician Tracker: rank EVERY sitting member, not only the ones with a
-- disclosed trade in the window. The table under the Top eight listed 83 House
-- members because politician_rankings started from the trade aggregates; it now
-- starts from congress_members. Traders sort first by the requested key; members
-- with no disclosed trade in the window follow, alphabetically, with
-- trades = buys = sells = 0, disclosed_volume = 0 and last_trade = null.
-- Former members (in_office = false) still appear when they traded in the window.
--
-- Same signature as 20260930010000, so the app needs no change to call it.
-- Additive and idempotent. NOT applied by CI or by Claude: apply manually in
-- the SQL Editor.

create or replace function public.politician_rankings(
  window_days int default 365,
  p_chamber text default null,
  p_party text default null,
  p_q text default null,
  p_sort text default 'volume',
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
  ),
  agg as (
    select t.bioguide_id,
      count(*) trades,
      count(*) filter (where t.type = 'purchase') buys,
      count(*) filter (where t.type in ('sale','sale_partial')) sells,
      sum(t.amount_mid) disclosed_volume,
      max(t.transaction_date) last_trade
    from t group by t.bioguide_id
  ),
  tk as (
    select s.bioguide_id, array_agg(s.ticker order by s.c desc, s.ticker) top_tickers
    from (
      select t.bioguide_id, t.ticker, count(*) c,
             row_number() over (partition by t.bioguide_id order by count(*) desc, t.ticker) rn
      from t where t.ticker is not null group by t.bioguide_id, t.ticker
    ) s where s.rn <= 3 group by s.bioguide_id
  )
  select m.bioguide_id, m.full_name, m.chamber, m.party, m.state, m.district, m.photo_url,
         coalesce(a.trades, 0), coalesce(a.buys, 0), coalesce(a.sells, 0),
         coalesce(a.disclosed_volume, 0), a.last_trade,
         coalesce(tk.top_tickers, '{}')
  from m
  left join agg a on a.bioguide_id = m.bioguide_id
  left join tk on tk.bioguide_id = m.bioguide_id
  where a.bioguide_id is not null or m.in_office
  order by
    (a.bioguide_id is null),
    case when p_sort = 'trades' then a.trades end desc nulls last,
    case when p_sort = 'latest' then a.last_trade end desc nulls last,
    a.disclosed_volume desc nulls last,
    a.trades desc nulls last,
    m.full_name
  limit greatest(1, least(lim, 1000));
$$;

grant execute on function public.politician_rankings(int, text, text, text, text, int)
  to anon, authenticated;
