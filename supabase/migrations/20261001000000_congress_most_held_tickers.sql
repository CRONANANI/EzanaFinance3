-- Most held tickers, for the Politician Tracker's rail panel (replaces the
-- "Most traded tickers" panel). Additive and idempotent. NOT applied by CI or
-- by Claude: apply manually in the SQL Editor after 20260930010000.
--
-- "Held" is INFERRED from STOCK Act disclosures, never asserted: filings
-- report amount bands, not share counts. Per member and ticker the rule
-- mirrors src/lib/politicians/position-status.js: a position counts as still
-- held when the member bought it at least once and their latest action on it
-- is a purchase or a partial sale ('likely-holds' or 'reduced'). A full sale
-- as the latest action, or sales with no visible buy, does not count.
--
-- window_days null (the default) looks at every disclosure on file, so a
-- position opened before the trailing year is not dropped.

drop function if exists public.congress_most_held_tickers(int, int, text, text, text);
create or replace function public.congress_most_held_tickers(
  window_days int default null,
  lim int default 10,
  p_chamber text default null,
  p_party text default null,
  p_q text default null
)
returns table (ticker text, holders bigint, buys bigint, last_buy date)
language sql stable set search_path = public as $$
  with scoped as (
    select ct.bioguide_id, ct.ticker, ct.type, ct.transaction_date, ct.disclosure_date
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
      s.ticker,
      bool_or(s.type = 'purchase') as has_buy,
      (array_agg(s.type order by s.transaction_date desc, s.disclosure_date desc nulls last))[1]
        as last_type,
      count(*) filter (where s.type = 'purchase') as buys,
      max(s.transaction_date) filter (where s.type = 'purchase') as last_buy
    from scoped s
    group by s.bioguide_id, s.ticker
  )
  select pm.ticker, count(*) as holders, sum(pm.buys)::bigint as buys, max(pm.last_buy) as last_buy
  from per_member pm
  where pm.has_buy and pm.last_type in ('purchase', 'sale_partial')
  group by pm.ticker
  order by holders desc, buys desc, pm.ticker
  limit greatest(1, least(lim, 100));
$$;

grant execute on function public.congress_most_held_tickers(int, int, text, text, text)
  to anon, authenticated;
