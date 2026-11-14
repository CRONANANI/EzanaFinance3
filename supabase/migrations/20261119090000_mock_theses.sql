-- Mock Trading: investment theses and per-trade thesis notes.
-- Writes are server-only (service role scoped to the caller's user id), matching
-- mock_portfolios and mock_trades. The browser client can only read its own rows.

create table if not exists public.mock_theses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  objective text not null default '' check (char_length(objective) <= 280),
  time_horizon text not null default '3_5y'
    check (time_horizon in ('lt_1y', '1_3y', '3_5y', '5y_plus')),
  risk_tolerance text not null default 'moderate'
    check (risk_tolerance in ('conservative', 'moderate', 'aggressive')),
  sector_focus text[] not null default '{}'
    check (coalesce(array_length(sector_focus, 1), 0) <= 6),
  position_rules text not null default '' check (char_length(position_rules) <= 280),
  max_single_name_pct numeric(5, 2) not null default 15
    check (max_single_name_pct >= 1 and max_single_name_pct <= 100),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one active thesis per user.
create unique index if not exists mock_theses_one_active_uq
  on public.mock_theses (user_id)
  where is_active;

-- Names are unique per user, ignoring case.
create unique index if not exists mock_theses_user_name_uq
  on public.mock_theses (user_id, lower(btrim(name)));

create index if not exists mock_theses_user_created_idx
  on public.mock_theses (user_id, created_at);

alter table public.mock_theses enable row level security;

drop policy if exists "mock_theses owner select" on public.mock_theses;
create policy "mock_theses owner select" on public.mock_theses
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No insert, update or delete policies: those go through /api/mock-theses.

-- Trade journal: which thesis a trade was placed under, and the user's note.
alter table public.mock_trades
  add column if not exists thesis_id uuid references public.mock_theses (id) on delete set null;

alter table public.mock_trades
  add column if not exists thesis_note text
  check (thesis_note is null or char_length(thesis_note) <= 280);

create index if not exists mock_trades_thesis_idx
  on public.mock_trades (thesis_id)
  where thesis_id is not null;
