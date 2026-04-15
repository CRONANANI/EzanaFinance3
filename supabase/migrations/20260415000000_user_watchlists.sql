-- Per-user watchlists and items (Deliverable B)

create table if not exists public.user_watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_watchlists_user_id_idx
  on public.user_watchlists (user_id);

create table if not exists public.user_watchlist_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.user_watchlists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('stock', 'crypto', 'commodity', 'politician')),
  ticker text not null,
  name text,
  sector text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (list_id, type, ticker)
);

create index if not exists user_watchlist_items_user_id_idx
  on public.user_watchlist_items (user_id);
create index if not exists user_watchlist_items_list_id_idx
  on public.user_watchlist_items (list_id);

alter table public.user_watchlists enable row level security;
alter table public.user_watchlist_items enable row level security;

create policy "Users can read their own watchlists"
  on public.user_watchlists for select
  using (auth.uid() = user_id);

create policy "Users can insert their own watchlists"
  on public.user_watchlists for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own watchlists"
  on public.user_watchlists for update
  using (auth.uid() = user_id);

create policy "Users can delete their own watchlists"
  on public.user_watchlists for delete
  using (auth.uid() = user_id);

create policy "Users can read their own watchlist items"
  on public.user_watchlist_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own watchlist items"
  on public.user_watchlist_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own watchlist items"
  on public.user_watchlist_items for update
  using (auth.uid() = user_id);

create policy "Users can delete their own watchlist items"
  on public.user_watchlist_items for delete
  using (auth.uid() = user_id);
