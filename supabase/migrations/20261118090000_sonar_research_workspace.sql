-- Sonar research workspace (Nov 2026): saved research, the research library,
-- share links, and what a run was asked with (controls, follow-up parent,
-- attachment name).
--
-- sonar_saved_research       one saved answer per row, owned by one user
-- sonar_research_collections the folders of a user's research library
-- sonar_shared_research()    the only way a share link reads a saved answer
--
-- Additive and safe to run more than once. No existing column changes type.

-- 1. Library folders ---------------------------------------------------------
create table if not exists public.sonar_research_collections (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       text        not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sonar_research_collections_name_uidx
  on public.sonar_research_collections (user_id, lower(btrim(name)));

alter table public.sonar_research_collections enable row level security;
revoke all on table public.sonar_research_collections from anon;
grant select, insert, update, delete on table public.sonar_research_collections to authenticated;

drop policy if exists sonar_research_collections_own on public.sonar_research_collections;
create policy sonar_research_collections_own on public.sonar_research_collections
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 2. Saved research ----------------------------------------------------------
create table if not exists public.sonar_saved_research (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users (id) on delete cascade,
  kind          text        not null check (kind in ('ping', 'research')),
  run_id        uuid        references public.sonar_research_runs (id) on delete set null,
  parent_id     uuid        references public.sonar_saved_research (id) on delete set null,
  collection_id uuid        references public.sonar_research_collections (id) on delete set null,
  question      text        not null check (char_length(question) between 1 and 600),
  title         text        not null check (char_length(title) between 1 and 160),
  subject       text        check (subject is null or char_length(subject) <= 160),
  ticker        text        check (ticker is null or char_length(ticker) <= 12),
  depth         text        check (depth is null or depth in ('quick', 'standard', 'deep')),
  controls      jsonb       not null default '{}'::jsonb,
  -- The answer as the reader saw it, so a saved item opens without a new run.
  snapshot      jsonb       not null default '{}'::jsonb
                check (octet_length(snapshot::text) <= 600000),
  note          text        check (note is null or char_length(note) <= 2000),
  -- 32 random bytes as hex, set by the server when the owner turns sharing on.
  share_token   text        unique check (share_token is null or share_token ~ '^[0-9a-f]{64}$'),
  shared_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists sonar_saved_research_user_idx
  on public.sonar_saved_research (user_id, updated_at desc);
create index if not exists sonar_saved_research_collection_idx
  on public.sonar_saved_research (user_id, collection_id);
create index if not exists sonar_saved_research_run_idx
  on public.sonar_saved_research (run_id) where run_id is not null;

alter table public.sonar_saved_research enable row level security;
revoke all on table public.sonar_saved_research from anon;
grant select, insert, update, delete on table public.sonar_saved_research to authenticated;

drop policy if exists sonar_saved_research_own on public.sonar_saved_research;
create policy sonar_saved_research_own on public.sonar_saved_research
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 3. Share links -------------------------------------------------------------
-- A share link reads exactly one row, by its token, through this function.
-- It returns the question, title, depth, dates and the stored snapshot. It
-- never returns the owner, their note, their controls or their folder. The
-- route that calls it trims the snapshot again to a public whitelist.
create or replace function public.sonar_shared_research(p_token text)
returns table (
  question  text,
  title     text,
  depth     text,
  snapshot  jsonb,
  shared_at timestamptz,
  saved_at  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.question, s.title, s.depth, s.snapshot, s.shared_at, s.created_at
  from public.sonar_saved_research s
  where p_token ~ '^[0-9a-f]{64}$'
    and s.share_token = p_token
  limit 1
$$;

revoke all on function public.sonar_shared_research(text) from public;
grant execute on function public.sonar_shared_research(text) to anon, authenticated;

-- 4. What a run was asked with ----------------------------------------------
alter table public.sonar_research_runs
  add column if not exists controls jsonb not null default '{}'::jsonb,
  add column if not exists parent_run_id uuid references public.sonar_research_runs (id) on delete set null,
  -- The file's name only. Its contents are read for the one run and never stored.
  add column if not exists attachment_name text
    check (attachment_name is null or char_length(attachment_name) <= 120);

create index if not exists sonar_research_runs_user_idx
  on public.sonar_research_runs (user_id, created_at desc) where user_id is not null;
create index if not exists sonar_research_runs_parent_idx
  on public.sonar_research_runs (parent_run_id) where parent_run_id is not null;
