-- Titans Shadow step 1: CUSIP to ticker map, Schedule 13D/13G XML columns,
-- whale_moves.cusip, and apply_cusip_tickers().
--
-- Applied by Noah by hand in the SQL Editor (SQL-4-titans-cusip-map). This file
-- records that change for the repo. The original SQL file was not in the
-- implementer's hands, so it is reconstructed from the live schema (table,
-- checks, indexes, RLS, policy, columns, function body and grants). It is
-- idempotent, except for the deliberate whale_moves reset at the end, which the
-- original also made (the rows rebuild over the next hourly runs).

create table if not exists public.sec_cusip_map (
  cusip          text primary key check (cusip ~ '^[0-9A-Z]{9}$'),
  ticker         text,
  exch_code      text,
  figi           text,
  name           text,
  security_type  text,
  market_sector  text,
  status         text not null check (status in ('mapped', 'unmapped', 'error')),
  source         text not null default 'openfigi',
  checked_at     timestamptz not null default now()
);

create index if not exists sec_cusip_map_ticker_idx
  on public.sec_cusip_map (ticker) where ticker is not null;
create index if not exists sec_cusip_map_status_idx
  on public.sec_cusip_map (status, checked_at);

alter table public.sec_cusip_map enable row level security;
drop policy if exists sec_cusip_map_public_read on public.sec_cusip_map;
create policy sec_cusip_map_public_read
  on public.sec_cusip_map for select
  to anon, authenticated
  using (true);

-- 13F holdings: find unmapped CUSIPs and look up mapped tickers quickly.
create index if not exists sec_13f_holdings_cusip_null_ticker_idx
  on public.sec_13f_holdings (cusip) where ticker is null;
create index if not exists sec_13f_holdings_ticker_idx
  on public.sec_13f_holdings (ticker) where ticker is not null;
create index if not exists sec_13f_holdings_accession_idx
  on public.sec_13f_holdings (accession_no);

-- Schedule 13D/13G structured cover data.
alter table public.sec_activist_positions
  add column if not exists subject_cusip text,
  add column if not exists form_type text,
  add column if not exists event_date date,
  add column if not exists reporting_persons jsonb not null default '[]'::jsonb,
  add column if not exists is_amendment boolean not null default false;

-- Whale moves keep the CUSIP so tickers can be filled after the fact.
alter table public.whale_moves add column if not exists cusip text;

create or replace function public.apply_cusip_tickers()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  h integer := 0;
  w integer := 0;
  a integer := 0;
begin
  update public.sec_13f_holdings x
     set ticker = m.ticker
    from public.sec_cusip_map m
   where x.ticker is null
     and m.cusip = upper(trim(x.cusip))
     and m.status = 'mapped'
     and m.ticker is not null;
  get diagnostics h = row_count;

  update public.whale_moves x
     set ticker = m.ticker
    from public.sec_cusip_map m
   where x.ticker is null
     and x.cusip is not null
     and m.cusip = upper(trim(x.cusip))
     and m.status = 'mapped'
     and m.ticker is not null;
  get diagnostics w = row_count;

  update public.sec_activist_positions x
     set subject_ticker = m.ticker
    from public.sec_cusip_map m
   where x.subject_ticker is null
     and x.subject_cusip is not null
     and m.cusip = upper(trim(x.subject_cusip))
     and m.status = 'mapped'
     and m.ticker is not null;
  get diagnostics a = row_count;

  return jsonb_build_object('holdings', h, 'whale_moves', w, 'activist', a);
end;
$function$;

revoke all on function public.apply_cusip_tickers() from public, anon, authenticated;
grant execute on function public.apply_cusip_tickers() to service_role;

-- Whale moves computed before this change compared against no prior quarter
-- (every position read "new"); clear them so the hourly cron rebuilds them.
delete from public.whale_moves where true;
