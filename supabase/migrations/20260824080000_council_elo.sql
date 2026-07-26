-- Build 2: university council ELO. The ORG (investment council) is the ranked
-- entity — parallel to user_elo (which ranks individuals), not an overload of it.
-- Rating blends externally-verified competition results with self-reported fund
-- RATIOS. Privacy is load-bearing on the fund side: only percentages/ratios are
-- ever stored — never AUM or dollar positions. Mirrors the user_elo pattern
-- (rating + append-only, reason-tagged transaction log) so it's auditable.

create table if not exists public.council_elo (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  current_rating integer not null default 1000 check (current_rating >= 0 and current_rating <= 10000),
  peak_rating integer not null default 1000,
  tier text not null default 'emerging' check (tier in ('emerging', 'competitive', 'established', 'elite', 'dynasty')),
  competition_rating integer not null default 1000,
  fund_rating integer not null default 1000,
  updated_at timestamptz not null default now()
);
create index if not exists idx_council_elo_rating on public.council_elo (current_rating desc);

create table if not exists public.council_elo_transactions (
  id bigserial primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  delta integer not null,
  component text not null check (component in ('competition', 'fund', 'decay', 'admin')),
  reason text not null,
  metadata jsonb default '{}'::jsonb,
  rating_before integer not null,
  rating_after integer not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_cet_org on public.council_elo_transactions (org_id, created_at desc);

-- Fund performance INPUTS — ratios/percentages only. No dollar column exists, by
-- design. Self-reported (flagged) until a verified brokerage-connection path lands.
create table if not exists public.council_fund_metrics (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  roi_pct numeric,
  sharpe numeric,
  max_drawdown_pct numeric,
  volatility_pct numeric,
  benchmark_alpha_pct numeric,
  period_label text,
  self_reported boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.council_elo enable row level security;
alter table public.council_elo_transactions enable row level security;
alter table public.council_fund_metrics enable row level security;

-- ELO, tier, and the RATIOS are public (that's the leaderboard). No dollars exist.
drop policy if exists "public reads council elo" on public.council_elo;
create policy "public reads council elo" on public.council_elo for select using (true);
drop policy if exists "public reads council elo log" on public.council_elo_transactions;
create policy "public reads council elo log" on public.council_elo_transactions for select using (true);
drop policy if exists "public reads fund ratios" on public.council_fund_metrics;
create policy "public reads fund ratios" on public.council_fund_metrics for select using (true);
drop policy if exists "org managers write fund metrics" on public.council_fund_metrics;
create policy "org managers write fund metrics" on public.council_fund_metrics for all using (
  org_id in (select org_id from public.org_members where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active)
) with check (
  org_id in (select org_id from public.org_members where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active)
);
