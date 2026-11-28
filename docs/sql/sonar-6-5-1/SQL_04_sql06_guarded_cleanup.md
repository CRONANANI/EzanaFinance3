# Sonar 6.5.1 SQL 04: guarded version of 6.4 SQL 06 (predecessor duplicate cleanup)

**Only after the backfill, only if 6.4 SQL 05 check 3 returns rows, and only with approval of
the exact rows.** 6.4 SQL 06 deletes predecessor rows that share (ticker, concept, frame) with
a successor row. Sonar's loaders already prefer the successor per frame
(`preferSuccessorFacts`, applied in `filedFiguresPaged` since 6.5), so SQL 06 is hygiene, not a
correctness requirement. This version keeps a copy of every row it deletes and deletes only
the rows that were reviewed.

```sql
-- 1. Copy the rows that would be deleted (review this table; keep it).
create table if not exists public.sec_fundamentals_predecessor_shadow_backup
  (like public.sec_fundamentals including defaults);

insert into public.sec_fundamentals_predecessor_shadow_backup
select p.*
  from public.sec_fundamentals p
  join public.sec_registrant_successions m on m.predecessor_cik = p.cik and m.verified
  join public.sec_fundamentals s
    on s.ticker = p.ticker and s.concept = p.concept and s.frame = p.frame
   and s.cik = m.successor_cik;

alter table public.sec_fundamentals_predecessor_shadow_backup enable row level security;
revoke all on public.sec_fundamentals_predecessor_shadow_backup from anon, authenticated;

select ticker, cik, concept, frame, value from public.sec_fundamentals_predecessor_shadow_backup
order by ticker, concept, frame;             -- 2. review these exact rows

-- 3. Delete only the reviewed rows (same keys as the backup).
delete from public.sec_fundamentals p
 using public.sec_fundamentals_predecessor_shadow_backup b
 where p.cik = b.cik and p.concept = b.concept and p.frame = b.frame and p.ticker = b.ticker;
```

Rollback (restores the deleted rows from the backup; the backup has exactly the table's
columns, so a plain insert works unless a column was added since):

```sql
insert into public.sec_fundamentals
select * from public.sec_fundamentals_predecessor_shadow_backup
on conflict do nothing;
```
