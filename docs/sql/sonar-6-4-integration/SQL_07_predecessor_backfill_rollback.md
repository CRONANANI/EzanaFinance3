# SQL 07: roll back the predecessor backfill

Removes every row the backfill wrote. SQL 04 showed **zero rows under the predecessor CIKs** before the backfill (Nov 28 2026), so every row under those CIKs that carries the mapped ticker came from the backfill. Run the preview first, then turn the mapping off: unset `SEC_PREDECESSOR_MAPPING` and stop calling the ingest with `?predecessors=1`. The next ingest run will not write the rows again.

```sql
-- Preview
select f.ticker, f.cik, count(*) as rows
  from public.sec_fundamentals f
  join public.sec_registrant_successions s on s.predecessor_cik = f.cik and s.ticker = f.ticker
 group by 1, 2;

-- Delete
delete from public.sec_fundamentals f
 using public.sec_registrant_successions s
 where s.predecessor_cik = f.cik
   and s.ticker = f.ticker;

-- Optional: drop the mapping table entirely (only if the feature is abandoned)
-- drop table if exists public.sec_registrant_successions;
```
