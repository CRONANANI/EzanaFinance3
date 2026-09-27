-- Senate financial disclosures: the same two tables the House has, so one page
-- implementation can serve both chambers. Written, NEVER executed.
--
-- There is no Senate ingest yet. These exist so the Senate page can be built
-- against the real API contract instead of a parallel mock path; until rows
-- arrive the page renders its sample state, which says so on its face.
--
-- Shape follows public.house_disclosure_filings / public.house_trades
-- deliberately, with one difference: senators represent a STATE, not a
-- state-plus-district, so `state` replaces `state_dst`/`district`.
--
-- Source: Senate Office of Public Records (efdsearch.senate.gov). Its PTRs are
-- structured electronic forms rather than scanned PDFs, so there is no
-- needs_ocr equivalent here and no OCR-pending state on the Senate page.

create table if not exists public.senate_disclosure_filings (
  doc_id            text primary key,
  prefix            text,
  last_name         text not null,
  first_name        text not null,
  suffix            text,
  filing_type       text not null,
  filing_type_label text,
  state             text,                            -- 'CA'; no district for a senator
  filing_year       int not null,
  covered_year      integer,                         -- the reporting year a filing covers
  disclosure_type   text,
  filing_date       date,
  filing_date_raw   text,                            -- kept only when a date was present and rejected
  report_url        text,                            -- the eFD page for this filing
  is_ptr            boolean not null default false,
  trades_parsed     boolean not null default false,
  synced_at         timestamptz not null default now()
);
create index if not exists idx_sdf_year on public.senate_disclosure_filings (filing_year desc);
create index if not exists idx_sdf_ptr on public.senate_disclosure_filings (is_ptr, filing_date desc);
create index if not exists idx_sdf_name on public.senate_disclosure_filings (last_name, first_name);

-- Amounts are STOCK Act brackets — a range, never an exact figure.
-- amount_midpoint is a labelled estimate used for SORTING only and is never
-- rendered as a dollar figure; see the disclosures page's hard rules.
create table if not exists public.senate_trades (
  id                   bigint generated always as identity primary key,
  doc_id               text not null references public.senate_disclosure_filings(doc_id) on delete cascade,
  last_name            text,
  first_name           text,
  state                text,
  ticker               text,                 -- null when the asset isn't a listed security
  asset_name           text not null,
  tx_type              text,                 -- 'P'(urchase) | 'S'(ale) | 'E'(xchange)
  tx_date              date,
  notification_date    date,
  amount_low           numeric,
  amount_high          numeric,              -- null = open-ended top
  amount_midpoint      numeric,              -- ESTIMATE, for sorting only
  amount_bracket_label text,                 -- e.g. '$1,001 - $15,000' as filed
  raw_row              text,                 -- the parsed source row, for audit
  synced_at            timestamptz not null default now()
);
create index if not exists idx_st_doc on public.senate_trades (doc_id);
create index if not exists idx_st_ticker on public.senate_trades (ticker);
create index if not exists idx_st_date on public.senate_trades (tx_date desc);

-- Per-year coverage, mirroring public.house_disclosure_coverage.
create table if not exists public.senate_disclosure_coverage (
  year        integer primary key,
  filings     integer not null,
  ptrs        integer not null,
  ptrs_legacy integer not null default 0,
  bad_dates   integer not null default 0,
  loaded_at   timestamptz not null default now()
);

-- Public-read, service-role write — the same pattern as the House tables.
alter table public.senate_disclosure_filings enable row level security;
drop policy if exists "public read senate_disclosure_filings" on public.senate_disclosure_filings;
create policy "public read senate_disclosure_filings" on public.senate_disclosure_filings for select using (true);

alter table public.senate_trades enable row level security;
drop policy if exists "public read senate_trades" on public.senate_trades;
create policy "public read senate_trades" on public.senate_trades for select using (true);

alter table public.senate_disclosure_coverage enable row level security;
drop policy if exists "public read senate_disclosure_coverage" on public.senate_disclosure_coverage;
create policy "public read senate_disclosure_coverage" on public.senate_disclosure_coverage for select using (true);
