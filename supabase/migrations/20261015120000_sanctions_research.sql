-- Sanctions entity research: aliases, identifiers, linked parties and
-- address localities for the Sanctions & Trade Policy page.
--
-- Filled by /api/cron/ingest-ofac-details from OFAC's own files:
--   ALT.CSV           alternate names (a.k.a., f.k.a., n.k.a.)
--   ADD.CSV           address localities ("City/State/Province/Postal Code")
--   SDN_COMMENTS.CSV  the overflow of remarks longer than SDN.CSV's 1000 chars
-- and from sanctions_entries.remarks, parsed by src/lib/sanctions/remarks.js.
-- Parsed fields are machine-extracted from OFAC's text, never verified by
-- hand; the original remarks stay untouched in sanctions_entries.remarks.
--
-- Additive and idempotent. Service role only: RLS is on and no policy grants
-- anon or authenticated access. Reads go through the server.

-- 1. Columns on the listing itself ---------------------------------------
alter table public.sanctions_entries
  add column if not exists localities text[] not null default '{}',
  add column if not exists remarks_full text,
  add column if not exists secondary_risk text,
  add column if not exists remarks_unparsed text,
  add column if not exists parser_version smallint,
  add column if not exists parsed_at timestamptz;

comment on column public.sanctions_entries.localities is
  'ADD.CSV "City/State/Province/Postal Code" values, verbatim.';
comment on column public.sanctions_entries.remarks_full is
  'remarks plus the SDN_COMMENTS.CSV overflow when OFAC truncated them; null when not truncated.';
comment on column public.sanctions_entries.secondary_risk is
  'Verbatim "Secondary sanctions risk:" clauses from the remarks, joined with " | ". Null when OFAC states none.';
comment on column public.sanctions_entries.remarks_unparsed is
  'Remarks segments the parser did not recognise, kept verbatim so nothing is dropped.';

create index if not exists idx_sanctions_countries
  on public.sanctions_entries using gin (countries);
create index if not exists idx_sanctions_type
  on public.sanctions_entries (entry_type);
create index if not exists idx_sanctions_name_trgm
  on public.sanctions_entries using gin (name gin_trgm_ops);

-- 2. Shared name normaliser: lower case, letters and digits only ---------
create or replace function public.sanctions_norm(p text)
returns text
language sql
immutable
parallel safe
as $$
  select nullif(trim(regexp_replace(lower(coalesce(p, '')), '[^[:alnum:]]+', ' ', 'g')), '');
$$;

-- 3. Aliases -------------------------------------------------------------
-- source 'alt'     : ALT.CSV, OFAC's alternate names
-- source 'remarks' : a.k.a. names written inside the remarks (OFAC's
--                    "weak" aliases); alt_num is null for these
-- key is 'alt:<alt_num>' or 'rem:<ent_num>:<normalised name>', so the
-- ingest can upsert on it and then prune rows it did not touch.
create table if not exists public.sanctions_aliases (
  key text primary key,
  ent_num integer not null,
  alt_num integer,
  alt_type text,
  alt_name text not null,
  alt_remarks text,
  source text not null check (source in ('alt', 'remarks')),
  name_norm text generated always as (public.sanctions_norm(alt_name)) stored,
  synced_at timestamptz not null default now()
);
create index if not exists sanctions_aliases_ent_idx
  on public.sanctions_aliases (ent_num);
create index if not exists sanctions_aliases_name_trgm
  on public.sanctions_aliases using gin (alt_name gin_trgm_ops);

-- 4. Identifiers extracted from the remarks -------------------------------
create table if not exists public.sanctions_identifiers (
  id bigserial primary key,
  ent_num integer not null,
  kind text not null,
  label text not null,
  value text not null,
  value_norm text not null, -- upper case, letters and digits only
  issuer text,
  is_alt boolean not null default false,
  raw text not null,
  parser_version smallint not null,
  synced_at timestamptz not null default now(),
  unique (ent_num, kind, value_norm)
);
create index if not exists sanctions_identifiers_value_idx
  on public.sanctions_identifiers (value_norm text_pattern_ops);
create index if not exists sanctions_identifiers_ent_idx
  on public.sanctions_identifiers (ent_num);

-- 5. "Linked To:" notes ----------------------------------------------------
-- OFAC's own relationship note. It does not by itself establish identity,
-- ownership, control or wrongdoing; the page says so.
create table if not exists public.sanctions_links (
  ent_num integer not null,
  linked_name text not null,
  linked_norm text generated always as (public.sanctions_norm(linked_name)) stored,
  synced_at timestamptz not null default now(),
  primary key (ent_num, linked_name)
);
create index if not exists sanctions_links_norm_idx
  on public.sanctions_links (linked_norm);

alter table public.sanctions_aliases enable row level security;
alter table public.sanctions_identifiers enable row level security;
alter table public.sanctions_links enable row level security;
