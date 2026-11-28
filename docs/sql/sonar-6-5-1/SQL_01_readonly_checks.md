# Sonar 6.5.1 SQL 01: read-only checks (run before any activation)

Read-only. Nothing here writes. Project `jhdzpadfzrhiekcfgtai`. Claude has not executed these.

## 1. Agency names the filter matches on (exact toptier names)

```sql
select awarding_agency, count(*) as awards, sum(award_amount) as obligated_usd
from public.contract_awards_resolved
where ticker is not null
group by awarding_agency
order by awards desc;

select funding_agency, count(*) as awards
from public.contract_awards_resolved
where ticker is not null
group by funding_agency
order by awards desc;
```

Every name used by `src/lib/contractors/agencies.js` (for example `Department of Defense`,
`Department of Energy`, `Department of Homeland Security`,
`National Aeronautics and Space Administration`) should appear exactly. Any variant spelling
means the filter would miss rows: report it before relying on agency results.

## 2. Awarding vs funding disagreement (how often the basis changes the answer)

```sql
select awarding_agency, funding_agency, count(*) as awards
from public.contract_awards_resolved
where ticker is not null and awarding_agency is distinct from funding_agency
group by 1, 2
order by awards desc
limit 30;
```

## 3. One row per award, negatives and future start dates

```sql
select count(*) as rows, count(distinct generated_award_id) as awards
from public.contract_awards_resolved;                        -- expected equal

select count(*) filter (where award_amount < 0)  as net_deobligations,
       count(*) filter (where award_amount = 0)  as zero_amount,
       count(*) filter (where action_date > current_date) as not_yet_started
from public.contract_awards_resolved
where ticker is not null;
```

`action_date` holds the award's USAspending Start Date (the ingest maps "Start Date" into it),
so rows after today are awards whose period of performance has not started.

## 4. Coverage of the comparable federal fiscal years

```sql
select fiscal_year, count(*) as awards, count(distinct ticker) as tickers, sum(award_amount) as obligated_usd
from public.contract_awards_resolved
where ticker is not null and fiscal_year between 2024 and 2027
group by fiscal_year
order by fiscal_year;
```

## 5. Congressional trades on reused symbols (PARA)

```sql
select ticker, transaction_date, disclosure_date, type, count(*) as trades
from public.congress_trades
where ticker in ('PARA', 'PSKY', 'SKYD')
group by 1, 2, 3, 4
order by transaction_date;
```

Trades on or before 2025-08-06 are Paramount Global (CIK 813828). PARA trades from
2025-08-07 on cannot be tied to a verified holder until Parabolic Technologies' listing date
is verified; Sonar leaves them unresolved.

## 6. Sector table rows for one company under two symbols

```sql
select ticker, sector, source, updated_at
from public.ticker_sectors
where ticker in ('PSKY', 'SKYD', 'PARA');
```

## 7. Price cache: inputs for the side-by-side price comparison

```sql
-- newest row per ticker within 10 days: how many differ between close and adj_close,
-- how many look like quotes stored as closes (no volume), how many are zero
with newest as (
  select distinct on (ticker) ticker, date, close, adj_close, volume
  from public.price_data_cache
  where date between current_date - 10 and current_date
  order by ticker, date desc
)
select count(*)                                            as tickers,
       count(*) filter (where adj_close is not null and adj_close <> close) as adjusted_differs,
       count(*) filter (where volume is null)              as quote_rows,
       count(*) filter (where coalesce(close, 0) <= 0)      as zero_or_missing
from newest;
```
