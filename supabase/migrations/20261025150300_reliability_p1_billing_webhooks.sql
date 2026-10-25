-- Reliability audit P1 (items 9-10): Stripe event de-duplication, Alpaca
-- webhook replay guard, Plaid sync queue.
-- Additive and idempotent. Service role only. Apply by hand.

-- Stripe: one row per event id, claimed before processing.
create table if not exists public.stripe_events (
  id text primary key,
  type text,
  created timestamptz,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'failed')),
  attempts int not null default 1,
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists stripe_events_failed_idx
  on public.stripe_events (updated_at desc) where status <> 'processed';
alter table public.stripe_events enable row level security;

-- Alpaca webhook: event ids already processed (replay guard).
create table if not exists public.alpaca_events (
  id text primary key,
  account_id text,
  received_at timestamptz not null default now()
);
alter table public.alpaca_events enable row level security;

-- The webhook has always written plaid_items.last_webhook_code, which the
-- live table lacks (the write failed silently).
alter table public.plaid_items add column if not exists last_webhook_code text;

-- Plaid: items whose holdings/transactions changed, drained every 5 minutes
-- by /api/cron/plaid-sync-drain (one row per item; a newer webhook just
-- refreshes requested_at).
create table if not exists public.pending_plaid_syncs (
  plaid_item_db_id uuid primary key references public.plaid_items(id) on delete cascade,
  webhook_code text,
  requested_at timestamptz not null default now(),
  attempts int not null default 0,
  last_error text
);
create index if not exists pending_plaid_syncs_requested_idx
  on public.pending_plaid_syncs (requested_at);
alter table public.pending_plaid_syncs enable row level security;
