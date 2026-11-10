-- Watchlist "Market Monitor" redesign + Smart Watchlists (Nov 2026).
--
-- 1. user_watchlist_items
--      + type 'bond_etf' (the Bond ETFs tab)
--      + starred_at   (star / pin, sorts to the top of the list and strip)
--      + added_by     ('user' | 'smart') and added_reason (why a smart list added it)
-- 2. smart_watchlist_rules   one rule set per smart list: asset class, match
--                            mode (all / any), conditions, caps, notify flag.
-- 3. smart_watchlist_events  every asset a smart list has added (the Smart
--                            watchlist card's feed, and the memory that stops a
--                            removed asset from being re-added).
-- 4. user_notifications: users may insert their own 'watchlist' notifications
--    (the existing browser-side big-move alerts had no insert policy, so they
--    never saved). Smart list notifications are written by the server.
--
-- Additive and idempotent. RLS on every new table: users read and write only
-- their own rows; events are written by the service role only.

-- ---------------------------------------------------------------------------
-- 1. Items: bond ETFs, star, provenance
-- ---------------------------------------------------------------------------
alter table public.user_watchlist_items add column if not exists starred_at   timestamptz;
alter table public.user_watchlist_items add column if not exists added_by     text not null default 'user';
alter table public.user_watchlist_items add column if not exists added_reason text;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'user_watchlist_items_type_check') then
    alter table public.user_watchlist_items drop constraint user_watchlist_items_type_check;
  end if;
  alter table public.user_watchlist_items
    add constraint user_watchlist_items_type_check
    check (type = any (array['stock', 'bond_etf', 'crypto', 'commodity', 'politician']));

  if not exists (select 1 from pg_constraint where conname = 'user_watchlist_items_added_by_check') then
    alter table public.user_watchlist_items
      add constraint user_watchlist_items_added_by_check
      check (added_by = any (array['user', 'smart']));
  end if;
end $$;

create index if not exists idx_user_watchlist_items_list_starred
  on public.user_watchlist_items (list_id, starred_at desc nulls last);

-- ---------------------------------------------------------------------------
-- 2. Smart watchlist rules (one per smart list)
-- ---------------------------------------------------------------------------
create table if not exists public.smart_watchlist_rules (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  list_id          uuid not null unique references public.user_watchlists(id) on delete cascade,
  asset_class      text not null
                   check (asset_class = any (array['stock', 'bond_etf', 'commodity', 'crypto', 'politician'])),
  match            text not null default 'all' check (match = any (array['all', 'any'])),
  conditions       jsonb not null default '[]'::jsonb
                   check (jsonb_typeof(conditions) = 'array'
                          and jsonb_array_length(conditions) between 1 and 6),
  max_items        integer not null default 25 check (max_items between 1 and 50),
  notify           boolean not null default true,
  enabled          boolean not null default true,
  last_run_at      timestamptz,
  last_run_added   integer not null default 0,
  last_error       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_smart_watchlist_rules_user on public.smart_watchlist_rules (user_id);
create index if not exists idx_smart_watchlist_rules_due
  on public.smart_watchlist_rules (last_run_at nulls first) where enabled;

alter table public.smart_watchlist_rules enable row level security;

drop policy if exists "Users read own smart rules"   on public.smart_watchlist_rules;
drop policy if exists "Users insert own smart rules" on public.smart_watchlist_rules;
drop policy if exists "Users update own smart rules" on public.smart_watchlist_rules;
drop policy if exists "Users delete own smart rules" on public.smart_watchlist_rules;

create policy "Users read own smart rules"
  on public.smart_watchlist_rules for select to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own smart rules"
  on public.smart_watchlist_rules for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.user_watchlists w where w.id = list_id and w.user_id = auth.uid())
  );

create policy "Users update own smart rules"
  on public.smart_watchlist_rules for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.user_watchlists w where w.id = list_id and w.user_id = auth.uid())
  );

create policy "Users delete own smart rules"
  on public.smart_watchlist_rules for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Smart watchlist events (what each smart list added, and why)
-- ---------------------------------------------------------------------------
create table if not exists public.smart_watchlist_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  list_id     uuid not null references public.user_watchlists(id) on delete cascade,
  rule_id     uuid references public.smart_watchlist_rules(id) on delete set null,
  item_type   text not null,
  ticker      text not null,
  name        text,
  reason      text,
  created_at  timestamptz not null default now()
);

create unique index if not exists uq_smart_watchlist_events_list_item
  on public.smart_watchlist_events (list_id, item_type, ticker);
create index if not exists idx_smart_watchlist_events_user_recent
  on public.smart_watchlist_events (user_id, created_at desc);

alter table public.smart_watchlist_events enable row level security;

drop policy if exists "Users read own smart events"   on public.smart_watchlist_events;
drop policy if exists "Users delete own smart events" on public.smart_watchlist_events;

create policy "Users read own smart events"
  on public.smart_watchlist_events for select to authenticated
  using (auth.uid() = user_id);

create policy "Users delete own smart events"
  on public.smart_watchlist_events for delete to authenticated
  using (auth.uid() = user_id);
-- No insert/update policy: the smart watchlist engine writes with the service role.

-- ---------------------------------------------------------------------------
-- 4. Watchlist notifications the user's own browser raises (big-move alerts)
-- ---------------------------------------------------------------------------
drop policy if exists "Users insert own watchlist notifications" on public.user_notifications;
create policy "Users insert own watchlist notifications"
  on public.user_notifications for insert to authenticated
  with check (auth.uid() = user_id and type = 'watchlist');
