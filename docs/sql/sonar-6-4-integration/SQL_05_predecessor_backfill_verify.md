# SQL 05: predecessor backfill verification (read-only)

Run after each staged backfill run. Every check has an expected result; stop and run SQL 07 (rollback) if any check fails.

```sql
-- 1. Look-ahead: no predecessor fact for a period ending on or after the effective date. Expected: 0 rows
select f.ticker, f.cik, f.concept, f.frame, f.period_end, s.effective_date
  from public.sec_fundamentals f
  join public.sec_registrant_successions s on s.predecessor_cik = f.cik and s.verified
 where f.period_end >= s.effective_date;

-- 2. Attribution: predecessor rows carry exactly the successor's ticker. Expected: 0 rows
select f.ticker, f.cik, s.ticker as expected_ticker, count(*)
  from public.sec_fundamentals f
  join public.sec_registrant_successions s on s.predecessor_cik = f.cik
 where f.ticker is distinct from s.ticker or not s.verified
 group by 1, 2, 3;

-- 3. Duplicates: one row per (ticker, concept, frame). Expected: 0 rows (else run SQL 06)
select f.ticker, f.concept, f.frame, string_agg(f.cik || '=' || f.value, ', ') as rows
  from public.sec_fundamentals f
 where f.ticker in (select ticker from public.sec_registrant_successions where verified)
 group by 1, 2, 3 having count(*) > 1;

-- 4. Provenance: every predecessor row has its accession and XBRL concept. Expected: 0 rows
select f.ticker, f.cik, f.concept, f.frame
  from public.sec_fundamentals f
  join public.sec_registrant_successions s on s.predecessor_cik = f.cik and s.verified
 where f.accession_no is null or f.taxonomy_concept is null;

-- 5. After counts, for the report
select f.ticker, f.cik, f.period_type, count(*) as rows, min(f.period_end), max(f.period_end)
  from public.sec_fundamentals f
 where f.ticker in (select ticker from public.sec_registrant_successions where verified)
 group by 1, 2, 3 order by 1, 2, 3;

-- 6. Gap closed: CY2025 annual revenue present. Expected: true for XOM, DMRC, XPRO
select s.ticker,
       exists (select 1 from public.sec_fundamentals f where f.ticker = s.ticker
                  and f.concept = 'revenue' and f.frame = 'CY2025') as has_cy2025_revenue
  from public.sec_registrant_successions s where s.verified order by 1;

-- 7. No other ticker changed: tickers with more than one CIK should be SUPN plus the three mapped tickers
select ticker, string_agg(distinct cik, ', ') as ciks
  from public.sec_fundamentals where ticker is not null
 group by ticker having count(distinct cik) > 1;
```
