-- Congress committees and committee assignments (Capitol Watch: Committee Assignments).
--
-- Applied by Noah by hand in the SQL Editor (SQL-3-congress-committees). This
-- file records that change for the repo. The original SQL file was not in the
-- implementer's hands, so it was reconstructed from the live schema
-- (columns, defaults, checks, keys, indexes, RLS and policies) and is written
-- to be idempotent: running it on the live database changes nothing.
--
-- Source: the public-domain unitedstates/congress-legislators project
-- (committees-current, committee-membership-current), synced daily by
-- /api/cron/ingest-committees with the service role. Public read only.

create table if not exists public.congress_committees (
  thomas_id        text primary key,
  parent_thomas_id text references public.congress_committees (thomas_id) on delete cascade,
  chamber          text not null check (chamber in ('house', 'senate', 'joint')),
  name             text not null check (char_length(name) between 1 and 300),
  url              text,
  jurisdiction     text,
  is_subcommittee  boolean not null default false,
  source           text not null default 'unitedstates/congress-legislators',
  synced_at        timestamptz not null default now()
);

create index if not exists congress_committees_parent_idx
  on public.congress_committees (parent_thomas_id);

create table if not exists public.congress_committee_members (
  committee_thomas_id text not null references public.congress_committees (thomas_id) on delete cascade,
  bioguide_id         text not null,
  member_name         text,
  side                text check (side is null or side in ('majority', 'minority')),
  rank                integer check (rank is null or rank > 0),
  title               text,
  synced_at           timestamptz not null default now(),
  primary key (committee_thomas_id, bioguide_id)
);

create index if not exists congress_committee_members_bioguide_idx
  on public.congress_committee_members (bioguide_id);

alter table public.congress_committees enable row level security;
alter table public.congress_committee_members enable row level security;

drop policy if exists congress_committees_public_read on public.congress_committees;
create policy congress_committees_public_read
  on public.congress_committees for select
  to anon, authenticated
  using (true);

drop policy if exists congress_committee_members_public_read on public.congress_committee_members;
create policy congress_committee_members_public_read
  on public.congress_committee_members for select
  to anon, authenticated
  using (true);
