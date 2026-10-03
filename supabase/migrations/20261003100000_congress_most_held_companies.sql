-- Most held, by COMPANY: share classes of one company count as one holding
-- (a member with GOOG and GOOGL holds Alphabet once, not twice), and each row
-- carries the company name (the most common disclosed asset name), so the
-- Politician Tracker can label its Most held companies chart.
--
-- Same arguments as 20261001000000, one extra output column (company), so the
-- return type changes and the function is dropped first. The share-class map
-- mirrors SHARE_CLASS in src/lib/politicians/tracker-model.js.
--
-- Additive and idempotent. NOT applied by CI or by Claude: apply manually in
-- the SQL Editor.

drop function if exists public.congress_most_held_tickers(int, int, text, text, text);
create or replace function public.congress_most_held_tickers(
  window_days int default null,
  lim int default 10,
  p_chamber text default null,
  p_party text default null,
  p_q text default null
)
returns table (ticker text, company text, holders bigint, buys bigint, last_buy date)
language sql stable set search_path = public as $$
  with scoped as (
    select
      ct.bioguide_id,
      case upper(ct.ticker)
        when 'GOOG' then 'GOOGL'
        when 'BRK.A' then 'BRK.B'
        when 'FOX' then 'FOXA'
        when 'NWS' then 'NWSA'
        when 'UA' then 'UAA'
        else upper(ct.ticker)
      end as tk,
      ct.asset_name,
      ct.type,
      ct.transaction_date,
      ct.disclosure_date
    from public.congress_trades ct
    join public.congress_members cm on cm.bioguide_id = ct.bioguide_id
    where ct.ticker is not null
      and (window_days is null or ct.transaction_date >= current_date - window_days)
      and (p_chamber is null or ct.chamber = lower(p_chamber))
      and (p_party is null or cm.party = upper(p_party))
      and (p_q is null or p_q = '' or cm.full_name ilike '%' || p_q || '%' or cm.state ilike p_q)
  ),
  per_member as (
    select
      s.bioguide_id,
      s.tk,
      bool_or(s.type = 'purchase') as has_buy,
      (array_agg(s.type order by s.transaction_date desc, s.disclosure_date desc nulls last))[1]
        as last_type,
      count(*) filter (where s.type = 'purchase') as buys,
      max(s.transaction_date) filter (where s.type = 'purchase') as last_buy
    from scoped s
    group by s.bioguide_id, s.tk
  ),
  names as (
    select s.tk, mode() within group (order by s.asset_name) as company
    from scoped s
    where s.asset_name is not null
    group by s.tk
  )
  select pm.tk, n.company, count(*)::bigint, sum(pm.buys)::bigint, max(pm.last_buy)
  from per_member pm
  left join names n on n.tk = pm.tk
  where pm.has_buy and pm.last_type in ('purchase', 'sale_partial')
  group by pm.tk, n.company
  order by count(*) desc, sum(pm.buys) desc, pm.tk
  limit greatest(1, least(lim, 100));
$$;

grant execute on function public.congress_most_held_tickers(int, int, text, text, text)
  to anon, authenticated;
