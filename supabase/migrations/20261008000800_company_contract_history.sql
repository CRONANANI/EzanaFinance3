-- 20261008000800_company_contract_history.sql
-- Ten years of federal contracts per listed company, for the Capitol Watch
-- company card. The live award tables start in July 2026; FY2008 onward is
-- read once a week from the warehouse by /api/cron/sync-company-contract-history
-- (matched on the same recipient name key as contractor_name_key()) and
-- written here, so the card reads two small indexed tables.
--   company_contract_history     ticker x fiscal year x awarding agency
--   company_contract_top_awards  the 15 largest awards per ticker
-- Server only: RLS on, no policies; the service role writes and reads.
--
-- Applied in the SQL Editor on 2026-10-08; this file mirrors the live
-- definitions.

create table if not exists public.company_contract_history (
  ticker           text not null,
  fiscal_year      integer not null,
  awarding_agency  text not null,
  award_count      integer,
  total_amount     numeric,
  synced_at        timestamptz not null default now(),
  primary key (ticker, fiscal_year, awarding_agency)
);
create index if not exists company_contract_history_ticker_fy
  on public.company_contract_history (ticker, fiscal_year desc);

create table if not exists public.company_contract_top_awards (
  ticker              text not null,
  generated_award_id  text not null,
  recipient_name      text,
  awarding_agency     text,
  award_amount        numeric,
  action_date         date,
  fiscal_year         integer,
  synced_at           timestamptz not null default now(),
  primary key (ticker, generated_award_id)
);
create index if not exists company_contract_top_awards_ticker_amount
  on public.company_contract_top_awards (ticker, award_amount desc);

alter table public.company_contract_history enable row level security;
alter table public.company_contract_top_awards enable row level security;
revoke all on public.company_contract_history, public.company_contract_top_awards
  from public, anon, authenticated;
grant all on public.company_contract_history, public.company_contract_top_awards to service_role;
