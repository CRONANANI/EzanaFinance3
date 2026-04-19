-- Ensure the user_watchlists + user_watchlist_items schema exists and is
-- visible to PostgREST. This migration is a defensive consolidation of the
-- two earlier migrations:
--
--   20260415000000_user_watchlists.sql
--   20260416120000_watchlists_hardening.sql
--
-- Every statement is idempotent (CREATE ... IF NOT EXISTS, DROP POLICY IF
-- EXISTS, etc.) so re-running it against a database that already has the
-- schema is safe. The final `notify pgrst, 'reload schema'` forces the
-- PostgREST schema cache to refresh immediately — without it, clients can
-- continue to see PGRST205 ("Could not find the table 'public.user_watchlists'
-- in the schema cache") for up to a minute after DDL changes, which is
-- exactly what happened here.
--
-- If you are seeing PGRST205 errors right now in production, this file
-- alone is enough to fix it: run `supabase db push` (if you use the CLI)
-- or paste its contents into the Supabase SQL Editor and execute once.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.user_watchlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_watchlist_items (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.user_watchlists(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in ('stock', 'crypto', 'commodity', 'politician')),
  ticker     text not null,
  name       text,
  sector     text,
  metadata   jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (list_id, type, ticker)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists user_watchlists_user_id_idx
  on public.user_watchlists (user_id);

create index if not exists user_watchlist_items_user_id_idx
  on public.user_watchlist_items (user_id);

create index if not exists user_watchlist_items_list_id_idx
  on public.user_watchlist_items (list_id);

-- Unique per-user label — gives the API a clean 23505 to translate into HTTP 409.
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'user_watchlists_user_label_unique'
  ) then
    create unique index user_watchlists_user_label_unique
      on public.user_watchlists (user_id, label);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- updated_at auto-bump trigger
-- ---------------------------------------------------------------------------
create or replace function public.touch_user_watchlists_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_watchlists_touch_updated_at on public.user_watchlists;
create trigger user_watchlists_touch_updated_at
  before update on public.user_watchlists
  for each row
  execute function public.touch_user_watchlists_updated_at();

-- ---------------------------------------------------------------------------
-- Row-Level Security
--
-- All API routes now go through a JWT-bound Supabase client, so these
-- policies are the load-bearing security boundary for watchlist data.
-- Drop+recreate each policy so re-running this migration lands the latest
-- definition even if an older variant already exists.
-- ---------------------------------------------------------------------------
alter table public.user_watchlists      enable row level security;
alter table public.user_watchlist_items enable row level security;

drop policy if exists "Users can read their own watchlists"       on public.user_watchlists;
drop policy if exists "Users can insert their own watchlists"     on public.user_watchlists;
drop policy if exists "Users can update their own watchlists"     on public.user_watchlists;
drop policy if exists "Users can delete their own watchlists"     on public.user_watchlists;

create policy "Users can read their own watchlists"
  on public.user_watchlists for select
  using (auth.uid() = user_id);

create policy "Users can insert their own watchlists"
  on public.user_watchlists for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own watchlists"
  on public.user_watchlists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own watchlists"
  on public.user_watchlists for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read their own watchlist items"    on public.user_watchlist_items;
drop policy if exists "Users can insert their own watchlist items"  on public.user_watchlist_items;
drop policy if exists "Users can update their own watchlist items"  on public.user_watchlist_items;
drop policy if exists "Users can delete their own watchlist items"  on public.user_watchlist_items;

create policy "Users can read their own watchlist items"
  on public.user_watchlist_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own watchlist items"
  on public.user_watchlist_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own watchlist items"
  on public.user_watchlist_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own watchlist items"
  on public.user_watchlist_items for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Kick the PostgREST schema cache so new tables / policies are visible
-- to the HTTP API immediately, not 30–60 seconds from now.
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';
