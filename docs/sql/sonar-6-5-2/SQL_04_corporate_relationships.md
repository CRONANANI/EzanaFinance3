# Sonar 6.5.2 SQL 04 (proposal): verified corporate relationships

**Not applied. Requires approval.** The table behind group-scope contract attribution. Rows are
validated in code by `src/lib/sec/entity-relationships.js` (`validateRelationship`,
`toAttributionRelations`); only `status = 'verified'` rows with a source reference and a
verifying evidence class are used, and only between their effective dates. No rows are seeded:
relationships are added from reviewed sources (SEC Exhibit 21, registry records), never from
name similarity.

```sql
create table if not exists public.corporate_entity_relationships (
  id                    bigint generated always as identity primary key,
  parent_cik            text not null check (parent_cik ~ '^[1-9][0-9]{0,9}$'),
  parent_name           text,
  child_identifier_type text not null check (child_identifier_type in ('cik', 'uei', 'lei', 'duns')),
  child_identifier      text not null,
  child_name            text,
  relationship          text not null check (relationship in ('subsidiary', 'parent', 'affiliate', 'predecessor')),
  effective_from        date,
  effective_to          date,
  source_kind           text,                     -- 'sec_ex21' | 'registry' | 'manual_review' | 'usaspending_parent_uei'
  source_reference      text,                     -- accession, registry id, review ticket
  evidence              text not null check (evidence in ('filed_exhibit', 'registry_record', 'manual_review', 'source_parent_field')),
  status                text not null default 'unverified' check (status in ('verified', 'unverified', 'rejected')),
  verified_by           text,
  verified_at           timestamptz,
  created_at            timestamptz not null default now(),
  constraint cer_period check (effective_from is null or effective_to is null or effective_from <= effective_to),
  constraint cer_verified_provenance check (
    status <> 'verified' or (source_reference is not null and verified_by is not null and verified_at is not null
                             and evidence in ('filed_exhibit', 'registry_record', 'manual_review'))),
  constraint cer_unique unique (parent_cik, child_identifier_type, child_identifier, relationship, effective_from)
);
create index if not exists cer_child on public.corporate_entity_relationships (child_identifier_type, child_identifier);
create index if not exists cer_parent on public.corporate_entity_relationships (parent_cik);

alter table public.corporate_entity_relationships enable row level security;
revoke all on public.corporate_entity_relationships from anon, authenticated;
```

## Verification

```sql
select status, evidence, count(*) from public.corporate_entity_relationships group by 1, 2;
-- no verified row may lack provenance (enforced by cer_verified_provenance)
```

## Rollback

```sql
drop table if exists public.corporate_entity_relationships;
```
