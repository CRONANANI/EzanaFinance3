-- ETF holdings (Form N-PORT). Applied by Claude Code via the Supabase MCP
-- (apply_migration) at Noah's request, Titans Shadow steps 2 to 4.
create table if not exists public.sec_etf_funds (
  series_id text primary key check (series_id ~ '^S[0-9]{9}$'),
  ticker text not null,
  class_id text,
  fund_name text,
  filer_cik text,
  latest_accession text,
  report_date date,
  net_assets numeric,
  holdings_count integer,
  status text not null default 'pending' check (status in ('pending', 'ok', 'no_nport', 'error')),
  status_detail text,
  synced_at timestamptz not null default now()
);

create unique index if not exists sec_etf_funds_ticker_key on public.sec_etf_funds (ticker);

create table if not exists public.sec_etf_holdings (
  series_id text not null references public.sec_etf_funds (series_id) on delete cascade,
  report_date date not null,
  line_no integer not null check (line_no >= 0),
  accession_no text not null,
  name text,
  title text,
  cusip text,
  isin text,
  ticker text,
  lei text,
  balance numeric,
  units text,
  value_usd numeric,
  pct_value numeric,
  asset_category text,
  issuer_category text,
  country text,
  synced_at timestamptz not null default now(),
  primary key (series_id, report_date, line_no)
);

create index if not exists sec_etf_holdings_ticker_idx
  on public.sec_etf_holdings (ticker) where ticker is not null;
create index if not exists sec_etf_holdings_cusip_idx
  on public.sec_etf_holdings (cusip) where cusip is not null;

alter table public.sec_etf_funds enable row level security;
alter table public.sec_etf_holdings enable row level security;

drop policy if exists "sec_etf_funds_public_read" on public.sec_etf_funds;
create policy "sec_etf_funds_public_read"
  on public.sec_etf_funds for select to anon, authenticated using (true);
drop policy if exists "sec_etf_holdings_public_read" on public.sec_etf_holdings;
create policy "sec_etf_holdings_public_read"
  on public.sec_etf_holdings for select to anon, authenticated using (true);

revoke insert, update, delete on public.sec_etf_funds from anon, authenticated;
revoke insert, update, delete on public.sec_etf_holdings from anon, authenticated;
grant select on public.sec_etf_funds to anon, authenticated;
grant select on public.sec_etf_holdings to anon, authenticated;

-- Holdings get tickers from the same CUSIP map as 13F (SQL 4).
create or replace function public.apply_cusip_tickers_etf()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer := 0;
begin
  update public.sec_etf_holdings x
     set ticker = m.ticker
    from public.sec_cusip_map m
   where x.ticker is null
     and x.cusip is not null
     and m.cusip = upper(trim(x.cusip))
     and m.status = 'mapped'
     and m.ticker is not null;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.apply_cusip_tickers_etf() from public, anon, authenticated;
grant execute on function public.apply_cusip_tickers_etf() to service_role;
