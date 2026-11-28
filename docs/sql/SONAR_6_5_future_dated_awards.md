# Sonar 6.5: future-dated rows in `contract_awards_resolved` (read-only investigation)

Read-only. Nothing here changes data. Run in the Supabase SQL editor for project
`jhdzpadfzrhiekcfgtai` when you want to size the issue. Claude has not executed these.

Background (corrected in Sonar 6.5.1): the ingest (`src/app/api/cron/ingest-usaspending/route.js`)
stores the award's USAspending **Start Date** (period of performance start) in the column named
`action_date`. A row dated after today is therefore an award whose work has not started yet,
which is valid, not a data error. Sonar excludes those rows from "awards in the window" and
reports how many it excluded. Bucket (c) below can still reveal genuine typos.

## 1. How many rows, and how far in the future

```sql
select
  count(*)                                   as future_rows,
  count(distinct ticker)                     as tickers,
  min(action_date)                           as earliest_future,
  max(action_date)                           as latest_future,
  sum(award_amount)                          as obligated_usd
from public.contract_awards_resolved
where action_date > current_date;
```

## 2. By how far ahead (a typo year such as 2062 versus a few days of clock skew)

```sql
select
  case
    when action_date <= current_date + 7   then 'a) within 7 days (likely timezone or load skew)'
    when action_date <= current_date + 366 then 'b) within a year (likely a wrong field)'
    else                                        'c) more than a year (likely a typo or placeholder)'
  end as bucket,
  count(*)        as rows,
  sum(award_amount) as obligated_usd
from public.contract_awards_resolved
where action_date > current_date
group by 1
order by 1;
```

## 3. Sample rows to compare with USAspending

```sql
select generated_award_id, ticker, award_amount, action_date
from public.contract_awards_resolved
where action_date > current_date
order by action_date desc
limit 50;
```

## 4. Tickers most affected

```sql
select ticker, count(*) as future_rows, sum(award_amount) as obligated_usd
from public.contract_awards_resolved
where action_date > current_date
group by ticker
order by future_rows desc
limit 25;
```

If bucket (c) dominates, the fix belongs in the ingestion mapping (which source field fills
`action_date`). No migration is proposed until the counts are reviewed.
