-- Market Monitor 2.0 (Nov 2026): Watchlist redesign, data for stages C and D.
--
-- 1. user_watchlist_notes         the private "Why I'm watching" note. One per
--                                 user per asset (type + ticker), so it follows
--                                 the asset across lists and survives a move.
-- 2. smart_watchlist_events.details  what the smart engine observed for each
--                                 matched condition when it added an asset, and
--                                 when (the Signal explainer reads it). Rows
--                                 written before this stay null.
--
-- Additive and idempotent. Notes are owner-only under RLS for select, insert,
-- update and delete. Nothing here changes the smart rule schema, the stored
-- reason text or the hourly schedule.

-- ---------------------------------------------------------------------------
-- 1. Monitoring notes
-- ---------------------------------------------------------------------------
create table if not exists public.user_watchlist_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_type   text not null
              check (item_type = any (array['stock', 'bond_etf', 'crypto', 'commodity', 'politician'])),
  ticker      text not null check (char_length(ticker) between 1 and 15),
  hypothesis  text not null default '' check (char_length(hypothesis) <= 600),
  risks       text not null default '' check (char_length(risks) <= 400),
  metrics     text not null default '' check (char_length(metrics) <= 400),
  catalysts   text not null default '' check (char_length(catalysts) <= 400),
  review_on   date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint user_watchlist_notes_not_empty
    check (char_length(hypothesis || risks || metrics || catalysts) > 0)
);

-- One note per user per asset; the API upserts on this key.
create unique index if not exists uq_user_watchlist_notes_user_item
  on public.user_watchlist_notes (user_id, item_type, ticker);

create or replace function public.touch_user_watchlist_notes_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_watchlist_notes_touch_updated_at on public.user_watchlist_notes;
create trigger user_watchlist_notes_touch_updated_at
  before update on public.user_watchlist_notes
  for each row
  execute function public.touch_user_watchlist_notes_updated_at();

alter table public.user_watchlist_notes enable row level security;

drop policy if exists "Users read own watchlist notes"   on public.user_watchlist_notes;
drop policy if exists "Users insert own watchlist notes" on public.user_watchlist_notes;
drop policy if exists "Users update own watchlist notes" on public.user_watchlist_notes;
drop policy if exists "Users delete own watchlist notes" on public.user_watchlist_notes;

create policy "Users read own watchlist notes"
  on public.user_watchlist_notes for select to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own watchlist notes"
  on public.user_watchlist_notes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own watchlist notes"
  on public.user_watchlist_notes for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own watchlist notes"
  on public.user_watchlist_notes for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_watchlist_notes to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Smart match details
-- ---------------------------------------------------------------------------
alter table public.smart_watchlist_events add column if not exists details jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'smart_watchlist_events_details_object'
  ) then
    alter table public.smart_watchlist_events
      add constraint smart_watchlist_events_details_object
      check (details is null or jsonb_typeof(details) = 'object');
  end if;
end $$;

-- Make the new table and column visible to the API straight away.
notify pgrst, 'reload schema';
