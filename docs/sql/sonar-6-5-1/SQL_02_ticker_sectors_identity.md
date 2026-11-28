# Sonar 6.5.1 SQL 02 (proposal): legal identity and effective periods on `ticker_sectors`

**Not applied. Requires approval.** Additive and nullable: existing readers keep working, and
Sonar already removes the PSKY/SKYD duplicate in code (`dedupeByEntity` in
`src/lib/sec/security-identity.js`). These columns let the table itself carry the legal
company (CIK) and the period each symbol applied, so historical research can keep prior
classifications and no consumer has to join on the ticker alone.

```sql
alter table public.ticker_sectors
  add column if not exists cik text,             -- SEC CIK of the legal company, no leading zeros
  add column if not exists effective_from date,  -- first day this symbol applied (null: unknown)
  add column if not exists effective_to date,    -- last day (null: still current)
  add column if not exists is_current boolean;   -- the display symbol for this CIK today

create index if not exists ticker_sectors_cik_idx on public.ticker_sectors (cik) where cik is not null;

-- RLS is unchanged: the existing policy "ticker sectors public read" (select using true) and
-- the revoke of insert/update/delete from anon and authenticated still apply to the new
-- columns. Writes stay service-role only.

-- Seed the one known case (verified identity facts, 6.4 report section 4):
update public.ticker_sectors set cik = '2041610', effective_from = '2025-08-07', is_current = false
 where ticker = 'PSKY';
update public.ticker_sectors set cik = '2041610', effective_from = '2025-08-07', is_current = true
 where ticker = 'SKYD';
```

## Verification

```sql
select ticker, sector, cik, effective_from, effective_to, is_current
from public.ticker_sectors where cik = '2041610';

-- more than one current symbol for a CIK would rank a company twice
select cik, count(*) filter (where is_current) as current_symbols
from public.ticker_sectors where cik is not null
group by cik having count(*) filter (where is_current) > 1;   -- expected: no rows
```

## Rollback

```sql
drop index if exists public.ticker_sectors_cik_idx;
alter table public.ticker_sectors
  drop column if exists is_current,
  drop column if exists effective_to,
  drop column if exists effective_from,
  drop column if exists cik;
```
