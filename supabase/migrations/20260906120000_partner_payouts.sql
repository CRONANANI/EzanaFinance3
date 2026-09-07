-- Partner payout accounts and payout history.
-- Masked data only: never full account or routing numbers.

create table if not exists public.partner_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method text not null check (method in ('plaid_ach', 'manual_ach')),
  institution_name text,
  account_name text,
  account_last4 text not null check (char_length(account_last4) = 4),
  routing_last4 text check (routing_last4 is null or char_length(routing_last4) = 4),
  plaid_item_id text,
  plaid_access_token_enc text,
  plaid_account_id text,
  status text not null default 'active' check (status in ('active', 'pending_verification', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One active payout account per partner.
create unique index if not exists partner_payout_accounts_one_active
  on public.partner_payout_accounts (user_id)
  where status = 'active';

create table if not exists public.partner_payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payout_account_id uuid references public.partner_payout_accounts(id) on delete set null,
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'usd',
  period_start date,
  period_end date,
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'failed')),
  paid_at timestamptz,
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists partner_payouts_user_created
  on public.partner_payouts (user_id, created_at desc);

alter table public.partner_payout_accounts enable row level security;
alter table public.partner_payouts enable row level security;

-- Owners can read their own rows. Writes go through the service role only
-- (API routes), matching the repo's withApiGuard + admin client pattern.
create policy "payout accounts: owner read"
  on public.partner_payout_accounts for select
  using (auth.uid() = user_id);

create policy "payouts: owner read"
  on public.partner_payouts for select
  using (auth.uid() = user_id);
