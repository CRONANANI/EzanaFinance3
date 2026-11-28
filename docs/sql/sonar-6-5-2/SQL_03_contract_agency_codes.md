# Sonar 6.5.2 SQL 03 (proposal, supersedes 6.5.1 SQL 03): agency codes on awards

**Not applied. Requires approval.** Reviewed from `docs/sql/sonar-6-5-1/SQL_03_contract_agency_codes.md`.
That version was valid but left two gaps: rows written by later ingest runs would carry no code
(the ingest writes names only), and the view recreation was left open. This version adds a
trigger so new and updated rows get their code from the same exact-name table, and states the
view step precisely. Idempotent.

```sql
alter table public.usaspending_contract_awards
  add column if not exists awarding_toptier_code text,
  add column if not exists funding_toptier_code text;

create table if not exists public.federal_toptier_agencies (
  cgac  text primary key,
  name  text not null unique             -- USAspending toptier name, exact
);
insert into public.federal_toptier_agencies (cgac, name) values
  ('097', 'Department of Defense'), ('089', 'Department of Energy'),
  ('070', 'Department of Homeland Security'), ('080', 'National Aeronautics and Space Administration'),
  ('075', 'Department of Health and Human Services'), ('036', 'Department of Veterans Affairs'),
  ('047', 'General Services Administration'), ('015', 'Department of Justice'),
  ('019', 'Department of State'), ('020', 'Department of the Treasury'),
  ('069', 'Department of Transportation')
on conflict (cgac) do nothing;
alter table public.federal_toptier_agencies enable row level security;
drop policy if exists "toptier agencies public read" on public.federal_toptier_agencies;
create policy "toptier agencies public read" on public.federal_toptier_agencies for select using (true);
revoke insert, update, delete on public.federal_toptier_agencies from anon, authenticated;

-- Backfill (idempotent: only rows without a code)
update public.usaspending_contract_awards a set awarding_toptier_code = t.cgac
  from public.federal_toptier_agencies t
 where a.awarding_agency = t.name and a.awarding_toptier_code is null;
update public.usaspending_contract_awards a set funding_toptier_code = t.cgac
  from public.federal_toptier_agencies t
 where a.funding_agency = t.name and a.funding_toptier_code is null;

-- New and updated rows
create or replace function public.usaspending_awards_set_toptier_codes()
returns trigger language plpgsql set search_path = public as $$
begin
  select cgac into new.awarding_toptier_code from public.federal_toptier_agencies where name = new.awarding_agency;
  select cgac into new.funding_toptier_code  from public.federal_toptier_agencies where name = new.funding_agency;
  return new;
end;
$$;
drop trigger if exists usaspending_awards_toptier_codes on public.usaspending_contract_awards;
create trigger usaspending_awards_toptier_codes
  before insert or update of awarding_agency, funding_agency on public.usaspending_contract_awards
  for each row execute function public.usaspending_awards_set_toptier_codes();

create index if not exists usaspending_awards_awarding_code
  on public.usaspending_contract_awards (awarding_toptier_code) where awarding_toptier_code is not null;
```

**View step (separate, at approval time).** `contract_awards_resolved` must expose the two
columns for Sonar to use codes (`agencyMatchState` prefers a code when the row carries one).
Take the live definition (`select pg_get_viewdef('public.contract_awards_resolved', true);`),
add `a.awarding_toptier_code, a.funding_toptier_code` to its select list, and recreate it with
`create or replace view ... with (security_invoker = true)` and the same grants. Recreate it
only from the live definition: later migrations may have changed it.

## Verification

```sql
select awarding_agency, awarding_toptier_code, count(*)
from public.usaspending_contract_awards group by 1, 2 order by 3 desc limit 30;
select count(*) filter (where awarding_agency is not null and awarding_toptier_code is null) as named_without_code
from public.usaspending_contract_awards;  -- these are agencies outside the 11, or variants: review
```

## Rollback

```sql
drop trigger if exists usaspending_awards_toptier_codes on public.usaspending_contract_awards;
drop function if exists public.usaspending_awards_set_toptier_codes();
drop index if exists public.usaspending_awards_awarding_code;
alter table public.usaspending_contract_awards
  drop column if exists funding_toptier_code, drop column if exists awarding_toptier_code;
drop table if exists public.federal_toptier_agencies;
```
