-- Reliability audit P0 (items 1-4): idempotent Alpaca orders, ACH transfers
-- and account creation; mock trade de-duplication.
-- Additive and idempotent. Apply by hand.

-- 1. Orders: a local row is claimed under client_order_id before Alpaca is
--    called; the unique indexes make a second submit with the same key find
--    that row instead of placing a second order.
alter table public.trade_history add column if not exists client_order_id text;
alter table public.trade_history add column if not exists alpaca_account_id text;
alter table public.trade_history add column if not exists error_message text;
alter table public.trade_history add column if not exists submitted_at timestamptz;
alter table public.trade_history add column if not exists updated_at timestamptz default now();

create unique index if not exists trade_history_client_order_id_uq
  on public.trade_history (client_order_id);
create unique index if not exists trade_history_alpaca_order_id_uq
  on public.trade_history (alpaca_order_id) where alpaca_order_id is not null;
create index if not exists trade_history_pending_idx
  on public.trade_history (created_at) where status = 'pending_submit';

-- Writes are server-side only (service role). The old "Users own trades" ALL
-- policy let a signed-in user insert or edit their own trade rows directly.
drop policy if exists "Users own trades" on public.trade_history;
drop policy if exists "Users can view own trade history" on public.trade_history;
drop policy if exists "Users read own trades" on public.trade_history;
create policy "Users read own trades" on public.trade_history
  for select using (auth.uid() = user_id);

-- 2. ACH transfers. Alpaca's transfer API takes no idempotency key, so the
--    local claim row is the guard; reconcile-alpaca-orders repairs stuck rows.
create table if not exists public.alpaca_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  alpaca_account_id text not null,
  relationship_id text not null,
  amount numeric(14, 2) not null check (amount > 0),
  direction text not null check (direction in ('INCOMING', 'OUTGOING')),
  alpaca_transfer_id text,
  status text not null default 'pending_submit',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists alpaca_transfers_idempotency_key_uq
  on public.alpaca_transfers (idempotency_key);
create unique index if not exists alpaca_transfers_alpaca_id_uq
  on public.alpaca_transfers (alpaca_transfer_id) where alpaca_transfer_id is not null;
create index if not exists alpaca_transfers_user_idx on public.alpaca_transfers (user_id);
create index if not exists alpaca_transfers_pending_idx
  on public.alpaca_transfers (created_at) where status = 'pending_submit';

alter table public.alpaca_transfers enable row level security;
drop policy if exists "Users read own transfers" on public.alpaca_transfers;
create policy "Users read own transfers" on public.alpaca_transfers
  for select using (auth.uid() = user_id);

-- 3. Account creation: claim the row first. Only the request that inserts
--    the 'creating' row may call Alpaca; everyone else reads the status.
--    (alpaca_account_id is nullable in the live table already; this makes
--    a rebuilt database match.)
alter table public.brokerage_accounts alter column alpaca_account_id drop not null;

create or replace function public.claim_brokerage_account(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into brokerage_accounts (user_id, account_status, updated_at)
  values (p_user, 'creating', now())
  on conflict (user_id) do nothing
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.claim_brokerage_account(uuid) from public, anon, authenticated;
grant execute on function public.claim_brokerage_account(uuid) to service_role;

-- The old "Users own brokerage" ALL policy let a user write their own
-- account status (e.g. mark it ACTIVE). Reads only; the server writes.
drop policy if exists "Users own brokerage" on public.brokerage_accounts;
drop policy if exists "Users can insert own brokerage account" on public.brokerage_accounts;
drop policy if exists "Users can update own brokerage account" on public.brokerage_accounts;
drop policy if exists "Users can view own brokerage account" on public.brokerage_accounts;
create policy "Users can view own brokerage account" on public.brokerage_accounts
  for select using (auth.uid() = user_id);

-- 4. Mock trades: a double submit with the same client_request_id records
--    one trade.
alter table public.mock_trades add column if not exists client_request_id text;
create unique index if not exists mock_trades_client_request_uq
  on public.mock_trades (user_id, client_request_id) where client_request_id is not null;
