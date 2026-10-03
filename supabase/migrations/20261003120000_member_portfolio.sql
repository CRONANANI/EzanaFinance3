-- Politician Tracker member panel: estimated open portfolio, by stock and by
-- sector. Two parts:
--
--   public.ticker_sectors        ticker -> sector, seeded by the companion
--                                20261003120100_ticker_sectors_seed.sql (S&P 500
--                                constituents carry GICS; other listed stocks
--                                carry Nasdaq's sector mapped onto GICS names;
--                                broad ETFs are 'Funds & ETFs'). Refresh with
--                                scripts/seed-ticker-sectors.mjs.
--   public.politician_portfolio  one member's open positions as JSON:
--                                { total, positions, stockPositions,
--                                  holdings: [{ticker, company, sector, est, share}],
--                                  sectors:  [{sector, est, positions, share}] }
--
-- ESTIMATES, not holdings. STOCK Act filings report amount RANGES, not share
-- counts or values. A position counts as open when the member bought it and
-- their latest disclosed action on it is a purchase or a partial sale (the
-- same rule as congress_most_held_tickers). Its size is the sum of purchase
-- range midpoints minus partial-sale midpoints since the last full sale,
-- floored at $1,001 (the smallest reportable amount) so an open position
-- never weighs zero. No market prices are applied. Share classes of one
-- company count once (GOOG + GOOGL = Alphabet). Untickered assets are
-- 'US Treasuries' when the asset name says so, else 'Bonds & private
-- (no ticker)'.
--
-- Additive and idempotent. NOT applied by CI or by Claude: apply manually in
-- the SQL Editor, then run the seed file.

create table if not exists public.ticker_sectors (
  ticker text primary key,
  sector text not null,
  source text,
  updated_at timestamptz not null default now()
);
alter table public.ticker_sectors enable row level security;
drop policy if exists "ticker sectors public read" on public.ticker_sectors;
create policy "ticker sectors public read" on public.ticker_sectors for select using (true);
revoke insert, update, delete on public.ticker_sectors from anon, authenticated;

create or replace function public.politician_portfolio(
  p_bioguide text,
  p_limit int default 10
)
returns jsonb
language sql stable set search_path = public as $$
  with t as (
    select
      ct.type,
      ct.transaction_date,
      ct.disclosure_date,
      ct.amount_mid,
      ct.asset_name,
      case upper(ct.ticker)
        when 'GOOG' then 'GOOGL'
        when 'BRK.A' then 'BRK.B'
        when 'FOX' then 'FOXA'
        when 'NWS' then 'NWSA'
        when 'UA' then 'UAA'
        else upper(ct.ticker)
      end as tk
    from public.congress_trades ct
    where ct.bioguide_id = p_bioguide
  ),
  k as (
    select t.*,
      coalesce(t.tk, 'asset:' || lower(regexp_replace(coalesce(t.asset_name, '?'), '\s+', ' ', 'g'))) as pkey
    from t
  ),
  lfs as (
    select pkey, max(transaction_date) filter (where type = 'sale') as last_full_sale
    from k group by pkey
  ),
  per as (
    select
      k.pkey,
      max(k.tk) as tk,
      mode() within group (order by k.asset_name) as asset,
      bool_or(k.type = 'purchase') as has_buy,
      (array_agg(k.type order by k.transaction_date desc, k.disclosure_date desc nulls last))[1] as last_type,
      coalesce(sum(k.amount_mid) filter (
        where k.type = 'purchase' and (l.last_full_sale is null or k.transaction_date > l.last_full_sale)), 0) as bought,
      coalesce(sum(k.amount_mid) filter (
        where k.type = 'sale_partial' and (l.last_full_sale is null or k.transaction_date > l.last_full_sale)), 0) as trimmed
    from k join lfs l on l.pkey = k.pkey
    group by k.pkey
  ),
  open_pos as (
    select
      p.pkey, p.tk, p.asset,
      greatest(p.bought - p.trimmed, 1001) as est,
      case
        when p.tk is not null then coalesce(s.sector, 'Unclassified')
        when p.asset ~* '(treasury|t-?bill|t-?note|u\.?s\.? treas)' then 'US Treasuries'
        else 'Bonds & private (no ticker)'
      end as sector
    from per p
    left join public.ticker_sectors s on s.ticker = p.tk
    where p.has_buy and p.last_type in ('purchase', 'sale_partial')
  ),
  tot as (select coalesce(sum(est), 0) as total, count(*) as positions,
                 count(*) filter (where tk is not null) as stock_positions from open_pos)
  select jsonb_build_object(
    'total', (select total from tot),
    'positions', (select positions from tot),
    'stockPositions', (select stock_positions from tot),
    'holdings', coalesce((
      select jsonb_agg(h order by h.est desc, h.ticker)
      from (
        select o.tk as ticker, o.asset as company, o.sector, o.est,
               case when tt.total > 0 then round(o.est / tt.total, 4) end as share
        from open_pos o, tot tt
        where o.tk is not null and o.est > 0
        order by o.est desc, o.tk
        limit greatest(1, least(p_limit, 50))
      ) h), '[]'::jsonb),
    'sectors', coalesce((
      select jsonb_agg(x order by x.est desc, x.sector)
      from (
        select o.sector, sum(o.est) as est, count(*) as positions,
               case when tt.total > 0 then round(sum(o.est) / tt.total, 4) end as share
        from open_pos o, tot tt
        group by o.sector, tt.total
      ) x), '[]'::jsonb)
  );
$$;

grant execute on function public.politician_portfolio(text, int) to anon, authenticated;
