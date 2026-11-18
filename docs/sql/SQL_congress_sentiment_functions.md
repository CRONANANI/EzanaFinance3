# Congress sentiment functions (Nov 18 2026)

Read-only aggregates over `public.congress_trades` for the Politician Tracker
sentiment feature and the Inside the Capitol sector card. Creates two functions
and nothing else: no table, column or policy changes. Execution is limited to
`service_role` (the API routes call them through the admin client).

Counting rules:
- A buy is `type = 'purchase'`. A sell is `type in ('sale', 'sale_partial')`.
  Exchanges are left out.
- Dollars are the midpoint of the disclosed range (`amount_mid`), so dollar
  figures are estimates.
- The year is the transaction year.
- Sector comes from `public.ticker_sectors` (GICS names). A trade whose ticker
  has no sector row is counted as `Unclassified`.

```sql
create or replace function public.congress_sentiment_by_year()
returns table (
  yr int,
  trades bigint,
  buys bigint,
  sells bigint,
  buy_usd numeric,
  sell_usd numeric,
  members bigint,
  net_buyers bigint,
  net_sellers bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with t as (
    select extract(year from transaction_date)::int as yr,
           bioguide_id,
           type,
           coalesce(amount_mid, 0) as usd
    from public.congress_trades
    where type in ('purchase', 'sale', 'sale_partial')
      and transaction_date is not null
  ),
  m as (
    select yr, bioguide_id,
           coalesce(sum(usd) filter (where type = 'purchase'), 0) as b,
           coalesce(sum(usd) filter (where type <> 'purchase'), 0) as s
    from t
    group by yr, bioguide_id
  ),
  y as (
    select yr,
           count(*) as trades,
           count(*) filter (where type = 'purchase') as buys,
           count(*) filter (where type <> 'purchase') as sells,
           coalesce(sum(usd) filter (where type = 'purchase'), 0) as buy_usd,
           coalesce(sum(usd) filter (where type <> 'purchase'), 0) as sell_usd
    from t
    group by yr
  )
  select y.yr, y.trades, y.buys, y.sells, y.buy_usd, y.sell_usd,
         count(m.bioguide_id) as members,
         count(m.bioguide_id) filter (where m.b > m.s) as net_buyers,
         count(m.bioguide_id) filter (where m.s > m.b) as net_sellers
  from y
  join m on m.yr = y.yr
  group by y.yr, y.trades, y.buys, y.sells, y.buy_usd, y.sell_usd
  order by y.yr;
$$;

create or replace function public.congress_sector_sentiment(p_year int)
returns table (
  sector text,
  trades bigint,
  buys bigint,
  sells bigint,
  buy_usd numeric,
  sell_usd numeric,
  members bigint,
  net_buyers bigint,
  net_sellers bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with t as (
    select coalesce(s.sector, 'Unclassified') as sector,
           c.bioguide_id,
           c.type,
           coalesce(c.amount_mid, 0) as usd
    from public.congress_trades c
    left join public.ticker_sectors s on upper(s.ticker) = upper(c.ticker)
    where c.type in ('purchase', 'sale', 'sale_partial')
      and c.transaction_date >= make_date(p_year, 1, 1)
      and c.transaction_date < make_date(p_year + 1, 1, 1)
  ),
  m as (
    select sector, bioguide_id,
           coalesce(sum(usd) filter (where type = 'purchase'), 0) as b,
           coalesce(sum(usd) filter (where type <> 'purchase'), 0) as s
    from t
    group by sector, bioguide_id
  ),
  g as (
    select sector,
           count(*) as trades,
           count(*) filter (where type = 'purchase') as buys,
           count(*) filter (where type <> 'purchase') as sells,
           coalesce(sum(usd) filter (where type = 'purchase'), 0) as buy_usd,
           coalesce(sum(usd) filter (where type <> 'purchase'), 0) as sell_usd
    from t
    group by sector
  )
  select g.sector, g.trades, g.buys, g.sells, g.buy_usd, g.sell_usd,
         count(m.bioguide_id) as members,
         count(m.bioguide_id) filter (where m.b > m.s) as net_buyers,
         count(m.bioguide_id) filter (where m.s > m.b) as net_sellers
  from g
  join m on m.sector = g.sector
  group by g.sector, g.trades, g.buys, g.sells, g.buy_usd, g.sell_usd
  order by g.trades desc;
$$;

revoke all on function public.congress_sentiment_by_year() from public, anon, authenticated;
revoke all on function public.congress_sector_sentiment(int) from public, anon, authenticated;
grant execute on function public.congress_sentiment_by_year() to service_role;
grant execute on function public.congress_sector_sentiment(int) to service_role;
```

## Rotation by year (added Nov 18 2026, applied)

Counts, per transaction year, buys and sells of bonds and Treasuries (bond
ETF tickers, or asset names that read as Treasuries, municipal issues, notes
or coupon bonds; money-market funds are left out as cash), of the defensive
sectors (Consumer Staples, Utilities, Health Care) and of the cyclical
sectors (Consumer Discretionary, Financials, Industrials, Information
Technology, Materials, Communication Services, Energy, Real Estate). Read-only;
service role only.

```sql
create or replace function public.congress_rotation_by_year()
returns table (
  yr int,
  bond_buys bigint, bond_sells bigint,
  def_buys bigint, def_sells bigint,
  cyc_buys bigint, cyc_sells bigint,
  bond_buy_usd numeric, bond_sell_usd numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with t as (
    select extract(year from c.transaction_date)::int as yr,
           c.type,
           coalesce(c.amount_mid, 0) as usd,
           case
             when upper(coalesce(c.ticker, '')) in (
               'TLT','IEF','SHY','BND','AGG','LQD','HYG','JNK','SGOV','BIL','GOVT','TIP','SCHP',
               'VGIT','VGSH','VGLT','MUB','VCIT','VCSH','BSV','BIV','BLV','SCHO','SCHR','SCHZ',
               'SPTL','SPTS','IGSB','IGIB','USIG','EDV','ZROZ','TLH','IEI','SHV','MINT','JPST',
               'FLOT','VTEB','TFI','EMB','BNDX','IAGG','STIP','VTIP')
               or c.asset_name ~* '(treasury|t-bills?\y|\ytreas\y|municipal|\ybonds?\y|\ynts\y|\ynotes? due|rate/coupon|matures:|\d+\.\d+%\s*\d{4,6}|debenture)'
               then 'bond'
             when s.sector in ('Consumer Staples', 'Utilities', 'Health Care') then 'defensive'
             when s.sector in ('Consumer Discretionary', 'Financials', 'Industrials',
                               'Information Technology', 'Materials', 'Communication Services',
                               'Energy', 'Real Estate') then 'cyclical'
             else null
           end as bucket
    from public.congress_trades c
    left join public.ticker_sectors s on upper(s.ticker) = upper(c.ticker)
    where c.type in ('purchase', 'sale', 'sale_partial')
      and c.transaction_date is not null
  )
  select yr,
         count(*) filter (where bucket = 'bond' and type = 'purchase'),
         count(*) filter (where bucket = 'bond' and type <> 'purchase'),
         count(*) filter (where bucket = 'defensive' and type = 'purchase'),
         count(*) filter (where bucket = 'defensive' and type <> 'purchase'),
         count(*) filter (where bucket = 'cyclical' and type = 'purchase'),
         count(*) filter (where bucket = 'cyclical' and type <> 'purchase'),
         coalesce(sum(usd) filter (where bucket = 'bond' and type = 'purchase'), 0),
         coalesce(sum(usd) filter (where bucket = 'bond' and type <> 'purchase'), 0)
  from t
  group by yr
  order by yr;
$$;

revoke all on function public.congress_rotation_by_year() from public, anon, authenticated;
grant execute on function public.congress_rotation_by_year() to service_role;
```
