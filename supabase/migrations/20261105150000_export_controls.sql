-- Deep research (Nov 2026): US export controls, separate from the sanctions
-- tables. Written daily by /api/cron/ingest-export-controls.
create table if not exists public.export_control_entries (
  id                      text primary key,
  list                    text not null
                          check (list in ('entity_list', 'military_end_user', 'unverified_list')),
  name                    text not null,
  alt_names               text[] not null default '{}',
  countries               text[] not null default '{}',
  federal_register_notice text,
  license_requirement     text,
  start_date              date,
  source_url              text,
  synced_at               timestamptz not null default now()
);
create index if not exists export_control_entries_countries_idx
  on public.export_control_entries using gin (countries);
create index if not exists export_control_entries_start_idx
  on public.export_control_entries (start_date desc);

create table if not exists public.export_control_rules (
  document_number  text primary key,
  title            text not null,
  abstract         text,
  type             text,
  publication_date date,
  effective_on     date,
  html_url         text,
  topics           text[] not null default '{}',
  synced_at        timestamptz not null default now()
);
create index if not exists export_control_rules_topics_idx
  on public.export_control_rules using gin (topics);
create index if not exists export_control_rules_pub_idx
  on public.export_control_rules (publication_date desc);

alter table public.export_control_entries enable row level security;
alter table public.export_control_rules enable row level security;
revoke all on public.export_control_entries from anon, authenticated;
revoke all on public.export_control_rules from anon, authenticated;
