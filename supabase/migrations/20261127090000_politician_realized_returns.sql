-- Realized returns for members of Congress (Nov 21 2026): the Politician Tracker's
-- "Realized return" column and Sonar's Best realized returns use one measure
-- (src/lib/politicians/realized-returns.js).
--
-- A realized trade is a disclosed purchase of a listed asset matched to the member's next
-- disclosed sale (full or partial) of the same asset after it. Its return is the first close
-- on or after the sale date against the first close on or after the purchase date: price
-- only, no dividends. Purchases still held are not realized.
--
--   public.politician_realized_trades   one row per realized purchase, priced once
--   public.politician_realized_returns  per member and Tracker period (30d, 90d, 6m, 1y, 2y,
--                                       all): the midpoint-weighted realized return, the
--                                       number of realized trades and how many gained
--
-- Both are filled by /api/cron/politician-realized-returns (hourly, incremental: it prices the
-- trades it has not priced yet, most recent first, then rebuilds the per-period figures).
-- Additive and idempotent. NOT applied by CI or by Claude: apply manually in the SQL Editor.

create table if not exists public.politician_realized_trades (
  purchase_id bigint primary key,
  bioguide_id text not null,
  ticker text not null,
  buy_date date not null,
  sell_date date not null,
  weight numeric not null,
  buy_close numeric,
  sell_close numeric,
  pct numeric,
  status text not null default 'ok' check (status in ('ok', 'no_price')),
  priced_at timestamptz not null default now()
);
create index if not exists politician_realized_trades_member_idx
  on public.politician_realized_trades (bioguide_id, buy_date);
create index if not exists politician_realized_trades_buy_idx
  on public.politician_realized_trades (buy_date);

create table if not exists public.politician_realized_returns (
  bioguide_id text not null,
  period text not null check (period in ('30d', '90d', '6m', '1y', '2y', 'all')),
  pct numeric,
  trades int not null default 0,
  wins int not null default 0,
  amount numeric,
  computed_at timestamptz not null default now(),
  primary key (bioguide_id, period)
);
create index if not exists politician_realized_returns_period_idx
  on public.politician_realized_returns (period);

alter table public.politician_realized_trades enable row level security;
alter table public.politician_realized_returns enable row level security;

drop policy if exists "realized trades public read" on public.politician_realized_trades;
create policy "realized trades public read" on public.politician_realized_trades
  for select using (true);
drop policy if exists "realized returns public read" on public.politician_realized_returns;
create policy "realized returns public read" on public.politician_realized_returns
  for select using (true);

revoke insert, update, delete on public.politician_realized_trades from anon, authenticated;
revoke insert, update, delete on public.politician_realized_returns from anon, authenticated;
