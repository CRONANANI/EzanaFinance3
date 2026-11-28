# SQL 06: remove predecessor rows shadowed by a successor row

Run only if check 3 in SQL 05 returns rows, and only with approval. It deletes predecessor-CIK rows for a (ticker, concept, frame) that the successor also reported. The successor's figure is the latest the company filed, restatements included. This is the same rule as `preferSuccessorFacts` in `src/lib/sec/registrant-map.js`. Successor rows are never deleted.

```sql
-- Preview: the rows that would be deleted
select p.ticker, p.cik, p.concept, p.frame, p.value as predecessor_value, s.value as successor_value
  from public.sec_fundamentals p
  join public.sec_registrant_successions m on m.predecessor_cik = p.cik and m.verified
  join public.sec_fundamentals s
    on s.ticker = p.ticker and s.concept = p.concept and s.frame = p.frame
   and s.cik = m.successor_cik;

-- Delete them
delete from public.sec_fundamentals p
 using public.sec_registrant_successions m, public.sec_fundamentals s
 where m.predecessor_cik = p.cik and m.verified
   and s.ticker = p.ticker and s.concept = p.concept and s.frame = p.frame
   and s.cik = m.successor_cik;
```
