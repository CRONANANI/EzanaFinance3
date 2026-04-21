-- Politician performance schema.
--
-- Two tables:
--   * `congressional_trades` — normalized cache of FMP senate/house trade
--     disclosures (transaction ranges are translated into min/max/midpoint
--     dollar figures for quick aggregation).
--   * `politician_annual_performance` — precomputed per-politician, per-year
--     estimated P&L, so the Inside the Capitol card can render without doing
--     any expensive historical-price lookups at request time.
--
-- Both tables are readable by anyone (RLS + permissive SELECT policy) because
-- the data is sourced from public congressional disclosures and drives a
-- public-facing card. Writes are done exclusively via the service-role client
-- from the cron/backfill endpoint, so no write policy is needed.

create table if not exists public.congressional_trades (
  id uuid primary key default gen_random_uuid(),
  politician_id text not null,
  politician_name text not null,
  chamber text not null check (chamber in ('house','senate')),
  party text,
  state text,
  symbol text,
  transaction_type text not null,
  transaction_date date not null,
  disclosure_date date,
  amount_min numeric,
  amount_max numeric,
  amount_midpoint numeric,
  raw jsonb,
  fetched_at timestamptz default now() not null,
  unique (politician_id, symbol, transaction_date, transaction_type)
);

create index if not exists congressional_trades_year_idx
  on public.congressional_trades ((extract(year from transaction_date)));
create index if not exists congressional_trades_politician_idx
  on public.congressional_trades (politician_id);
create index if not exists congressional_trades_symbol_date_idx
  on public.congressional_trades (symbol, transaction_date);

create table if not exists public.politician_annual_performance (
  politician_id text not null,
  politician_name text not null,
  chamber text not null,
  party text,
  year int not null,
  num_trades int not null,
  total_volume_estimated numeric not null,
  estimated_pnl numeric not null,
  estimated_return_pct numeric,
  biggest_winner_symbol text,
  biggest_winner_pnl numeric,
  computed_at timestamptz default now() not null,
  primary key (politician_id, year)
);

create index if not exists politician_perf_year_pnl_idx
  on public.politician_annual_performance (year, estimated_pnl desc);

alter table public.congressional_trades enable row level security;
alter table public.politician_annual_performance enable row level security;

drop policy if exists "congressional_trades_public_read" on public.congressional_trades;
create policy "congressional_trades_public_read"
  on public.congressional_trades
  for select
  using (true);

drop policy if exists "politician_annual_performance_public_read"
  on public.politician_annual_performance;
create policy "politician_annual_performance_public_read"
  on public.politician_annual_performance
  for select
  using (true);

notify pgrst, 'reload schema';
