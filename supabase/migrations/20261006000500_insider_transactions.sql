-- Insider transactions (Form 4). Applied by Claude Code via the Supabase MCP
-- (apply_migration) at Noah's request, Titans Shadow steps 2 to 4.
create table if not exists public.sec_insider_transactions (
  accession_no text not null,
  table_kind text not null check (table_kind in ('non_derivative', 'derivative')),
  line_no integer not null check (line_no >= 0),
  form_type text,                         -- '4' or '4/A'
  filed_at date,
  issuer_cik text,
  issuer_name text,
  issuer_ticker text,
  reporter_cik text,
  reporter_name text,
  reporter_title text,
  is_director boolean not null default false,
  is_officer boolean not null default false,
  is_ten_pct_owner boolean not null default false,
  is_other boolean not null default false,
  security_title text,
  transaction_date date,
  transaction_code text,                  -- P open-market buy, S sale, A award, M exercise, F tax withholding, G gift, ...
  acquired_disposed text check (acquired_disposed is null or acquired_disposed in ('A', 'D')),
  shares numeric,
  price numeric,
  value_usd numeric,                      -- shares * price when both are reported, else null
  shares_owned_after numeric,
  direct_indirect text check (direct_indirect is null or direct_indirect in ('D', 'I')),
  source text not null check (source in ('form4_xml', 'sec_dataset')),
  synced_at timestamptz not null default now(),
  primary key (accession_no, table_kind, line_no)
);

create index if not exists sec_insider_tx_ticker_date_idx
  on public.sec_insider_transactions (issuer_ticker, transaction_date desc);
create index if not exists sec_insider_tx_code_date_idx
  on public.sec_insider_transactions (transaction_code, transaction_date desc);
create index if not exists sec_insider_tx_issuer_cik_idx
  on public.sec_insider_transactions (issuer_cik);
create index if not exists sec_insider_tx_reporter_idx
  on public.sec_insider_transactions (reporter_cik);

alter table public.sec_insider_transactions enable row level security;
drop policy if exists "sec_insider_tx_public_read" on public.sec_insider_transactions;
create policy "sec_insider_tx_public_read"
  on public.sec_insider_transactions for select to anon, authenticated using (true);
revoke insert, update, delete on public.sec_insider_transactions from anon, authenticated;
grant select on public.sec_insider_transactions to anon, authenticated;
