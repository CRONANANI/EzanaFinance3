# SQL 03: harden `sec_registrant_successions` and correct DMRC's effective date

Run once, after SQL 01 and SQL 02 (both already applied in production on Nov 28 2026). Safe to re-run: every step checks before it changes anything. It writes only to `sec_registrant_successions` and its grants. No backfill.

What it fixes (found in the Nov 28 read-only review):

1. **DMRC effective date.** The seed used the 8-K12B filing date (2026-05-18). The filing says Old Digimarc completed the reorganization on **May 15, 2026**. No quarter or fiscal year ends between May 15 and May 17, so no stored fact would have mapped differently. The correction keeps the table exact.
2. **Grants.** `anon` and `authenticated` hold Supabase's default TRUNCATE, TRIGGER and REFERENCES grants on the table. Row-level security does not cover TRUNCATE. The API cannot issue it, but the grant should not exist.
3. **CIK format.** CIKs are stored without leading zeros, which is how `sec_fundamentals` stores them.
4. **Verified rows must say who verified them, and when.**
5. **One mapping per ticker and predecessor.**

```sql
-- 1. DMRC: completion date from 8-K12B 0001437749-26-017527
update public.sec_registrant_successions
   set effective_date = date '2026-05-15',
       notes = coalesce(notes, '') ||
               ' Effective date corrected Nov 28 2026 from the 8-K12B filing date (2026-05-18) to the completion date stated in the filing (2026-05-15).'
 where ticker = 'DMRC'
   and predecessor_cik = '1438231'
   and successor_cik = '2119322'
   and effective_date = date '2026-05-18';

-- 2. Grants: read only for signed-in users; nothing else for anon or authenticated
revoke truncate, trigger, references, insert, update, delete
  on public.sec_registrant_successions from anon, authenticated;
revoke select on public.sec_registrant_successions from anon;

-- 3 to 5. Constraints (added only if missing)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sec_registrant_successions_cik_format') then
    alter table public.sec_registrant_successions
      add constraint sec_registrant_successions_cik_format
      check (successor_cik ~ '^[1-9][0-9]{0,9}$' and predecessor_cik ~ '^[1-9][0-9]{0,9}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sec_registrant_successions_verified_provenance') then
    alter table public.sec_registrant_successions
      add constraint sec_registrant_successions_verified_provenance
      check (not verified or (verified_by is not null and verified_at is not null));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sec_registrant_successions_ticker_pred') then
    alter table public.sec_registrant_successions
      add constraint sec_registrant_successions_ticker_pred unique (ticker, predecessor_cik);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sec_registrant_successions_bounds') then
    alter table public.sec_registrant_successions
      add constraint sec_registrant_successions_bounds
      check (applies_from is null or applies_to is null or applies_from <= applies_to);
  end if;
end;
$$;

-- Check: the result should show 3 verified rows and DMRC on 2026-05-15
select ticker, predecessor_cik, successor_cik, effective_date, verified, verified_by
  from public.sec_registrant_successions order by ticker;
```
