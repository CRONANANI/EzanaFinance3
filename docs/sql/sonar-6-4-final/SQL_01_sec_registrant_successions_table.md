# SQL 01: `sec_registrant_successions` table (Sonar 6.4 final integration)

Run once in the Supabase SQL editor. Creates the reviewed predecessor/successor registrant table. Nothing reads it until `SEC_PREDECESSOR_MAPPING=1` is set for the fundamentals ingest, so creating it changes no data.

```sql
create table if not exists public.sec_registrant_successions (
  id               bigint generated always as identity primary key,
  ticker           text        not null,                 -- current security identifier
  successor_cik    text        not null,                 -- registrant that files now
  predecessor_cik  text        not null,                 -- registrant that filed before the effective date
  effective_date   date        not null,                 -- facts for periods ending BEFORE this date map to the ticker
  relationship     text        not null check (relationship in
                     ('holding_company_reorganization','redomiciliation','merger_successor')),
  source_accession text        not null check (source_accession ~ '^\d{10}-\d{2}-\d{6}$'),
  source_form      text        not null default '8-K12B',
  verified         boolean     not null default false,   -- only verified rows are used
  verified_by      text,
  verified_at      timestamptz,
  applies_from     date,                                 -- optional lower bound on period_end
  applies_to       date,                                 -- optional upper bound on period_end
  provenance       text        not null,                 -- how the row was established
  notes            text,
  created_at       timestamptz not null default now(),
  constraint sec_registrant_successions_distinct check (successor_cik <> predecessor_cik),
  constraint sec_registrant_successions_unique unique (predecessor_cik, successor_cik)
);

create index if not exists sec_registrant_successions_pred_idx
  on public.sec_registrant_successions (predecessor_cik) where verified;

alter table public.sec_registrant_successions enable row level security;

drop policy if exists sec_registrant_successions_read on public.sec_registrant_successions;
create policy sec_registrant_successions_read on public.sec_registrant_successions
  for select to authenticated using (true);

-- No insert/update/delete policies: only the service role (which bypasses RLS) writes.
revoke insert, update, delete on public.sec_registrant_successions from anon, authenticated;
```
