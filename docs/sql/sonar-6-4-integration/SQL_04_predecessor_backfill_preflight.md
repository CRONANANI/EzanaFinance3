# SQL 04: predecessor backfill preflight (read-only)

Run before the staged backfill and keep the output. It changes nothing. The expected baseline as of Nov 28 2026:
- **(a)** zero rows under the three predecessor CIKs;
- **(b)** XOM, DMRC and XPRO have quarterly rows only, from their successor CIKs;
- **(c)** one ticker (SUPN) already has two CIKs;
- **(d)** zero duplicate frames.

```sql
-- (a) rows already stored under a verified predecessor CIK: expected 0
select s.ticker, s.predecessor_cik, count(f.*) as rows_under_predecessor
  from public.sec_registrant_successions s
  left join public.sec_fundamentals f on f.cik = s.predecessor_cik
 where s.verified
 group by 1, 2 order by 1;

-- (b) before counts per mapped ticker, by period type
select f.ticker, f.cik, f.period_type, count(*) as rows, min(f.period_end) as first_end, max(f.period_end) as last_end
  from public.sec_fundamentals f
 where f.ticker in (select ticker from public.sec_registrant_successions where verified)
 group by 1, 2, 3 order by 1, 3;

-- (c) tickers with more than one CIK today: expected SUPN only
select ticker, string_agg(distinct cik, ', ') as ciks
  from public.sec_fundamentals where ticker is not null
 group by ticker having count(distinct cik) > 1;

-- (d) duplicate (ticker, concept, frame) across CIKs: expected 0
select count(*) as duplicate_frames from (
  select ticker, concept, frame from public.sec_fundamentals where ticker is not null
   group by 1, 2, 3 having count(distinct cik) > 1
) d;

-- (e) annual revenue gaps the backfill should close: expected XOM, DMRC, XPRO
select s.ticker,
       exists (select 1 from public.sec_fundamentals f where f.ticker = s.ticker
                  and f.concept = 'revenue' and f.frame = 'CY2025') as has_cy2025_revenue
  from public.sec_registrant_successions s where s.verified order by 1;
```
