-- Live SEC EDGAR filings surfaced on the sec-filings dataset page. EDGAR is the
-- source; the ingest-sec-filings cron populates these. Public-read, service-role
-- writes — same pattern as the gov_contract_* rollups.

-- Filing metadata (Phase 1). One row per filing across all three form families.
create table if not exists public.sec_filings (
  accession_no    text primary key,          -- e.g. 0001193125-26-054580
  form_type       text not null,             -- '13F-HR','13F-HR/A','SC 13D','SC 13G','4', etc.
  form_family     text not null,             -- 'insider' | 'institutional' | 'activist'
  cik             text not null,             -- zero-padded filer CIK
  filer_name      text not null,
  ticker          text,                      -- subject ticker where resolvable
  filed_at        timestamptz not null,
  period_of_report date,
  primary_doc_url text,                      -- canonical document URL
  index_url       text,                      -- filing index URL
  synced_at       timestamptz not null default now()
);
create index if not exists idx_sec_filings_family_date
  on public.sec_filings (form_family, filed_at desc);
create index if not exists idx_sec_filings_cik on public.sec_filings (cik);
create index if not exists idx_sec_filings_ticker on public.sec_filings (ticker);

-- 13F holdings (Phase 2). One row per position per 13F filing.
create table if not exists public.sec_13f_holdings (
  id             bigint generated always as identity primary key,
  accession_no   text not null references public.sec_filings(accession_no) on delete cascade,
  name_of_issuer text not null,
  cusip          text,
  ticker         text,
  value_usd      numeric not null default 0, -- normalized to whole USD (see cron)
  shares         numeric,
  share_type     text,                       -- 'SH' | 'PRN'
  put_call       text,
  synced_at      timestamptz not null default now()
);
create index if not exists idx_13f_holdings_acc on public.sec_13f_holdings (accession_no);
create index if not exists idx_13f_holdings_ticker on public.sec_13f_holdings (ticker);

-- 13D/13G activist positions (Phase 2). One row per filing's reported stake.
create table if not exists public.sec_activist_positions (
  accession_no    text primary key references public.sec_filings(accession_no) on delete cascade,
  subject_name    text,
  subject_cik     text,
  subject_ticker  text,
  percent_of_class numeric,                  -- reported % ownership
  shares          numeric,
  synced_at       timestamptz not null default now()
);
create index if not exists idx_activist_ticker on public.sec_activist_positions (subject_ticker);

do $$
declare t text;
begin
  foreach t in array array['sec_filings','sec_13f_holdings','sec_activist_positions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read %1$s" on public.%1$I', t);
    execute format('create policy "public read %1$s" on public.%1$I for select using (true)', t);
  end loop;
end $$;
