# Sonar 6.5.1 SQL 03 (proposal): toptier agency codes on contract awards

**Not applied. Requires approval.** The agency filter matches the stored USAspending toptier
agency NAME exactly today (no code column exists). These additive columns hold the CGAC
toptier code, so `awardMatchesAgency` (src/lib/contractors/agencies.js) switches to codes
automatically when a row carries `awarding_toptier_code` / `funding_toptier_code`.

```sql
alter table public.usaspending_contract_awards
  add column if not exists awarding_toptier_code text,
  add column if not exists funding_toptier_code text;

-- Backfill from the canonical toptier names (exact match only; anything else stays null).
with codes(name, cgac) as (values
  ('Department of Defense', '097'), ('Department of Energy', '089'),
  ('Department of Homeland Security', '070'), ('National Aeronautics and Space Administration', '080'),
  ('Department of Health and Human Services', '075'), ('Department of Veterans Affairs', '036'),
  ('General Services Administration', '047'), ('Department of Justice', '015'),
  ('Department of State', '019'), ('Department of the Treasury', '020'),
  ('Department of Transportation', '069'))
update public.usaspending_contract_awards a
   set awarding_toptier_code = c.cgac
  from codes c
 where a.awarding_agency = c.name and a.awarding_toptier_code is null;

with codes(name, cgac) as (values
  ('Department of Defense', '097'), ('Department of Energy', '089'),
  ('Department of Homeland Security', '070'), ('National Aeronautics and Space Administration', '080'),
  ('Department of Health and Human Services', '075'), ('Department of Veterans Affairs', '036'),
  ('General Services Administration', '047'), ('Department of Justice', '015'),
  ('Department of State', '019'), ('Department of the Treasury', '020'),
  ('Department of Transportation', '069'))
update public.usaspending_contract_awards a
   set funding_toptier_code = c.cgac
  from codes c
 where a.funding_agency = c.name and a.funding_toptier_code is null;
```

The view `contract_awards_resolved` must then be recreated with the two columns added to its
select list (same definition as `supabase/migrations/20261003140000_contractor_resolution.sql`
plus `a.awarding_toptier_code, a.funding_toptier_code`), keeping `security_invoker = true`
and the existing grants. Prepare that as a migration file at approval time against the live
view definition (`select pg_get_viewdef('public.contract_awards_resolved')`), since later
migrations may have changed it.

## Verification

```sql
select awarding_agency, awarding_toptier_code, count(*)
from public.usaspending_contract_awards
group by 1, 2 order by 3 desc limit 30;      -- named agencies carry a code; others null
```

## Rollback

```sql
alter table public.usaspending_contract_awards
  drop column if exists funding_toptier_code,
  drop column if exists awarding_toptier_code;
```
