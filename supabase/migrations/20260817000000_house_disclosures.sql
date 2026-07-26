-- House financial-disclosure filing INDEX from the Clerk's yearly bulk files
-- (<YEAR>FD.txt / .xml). One row per filing. Trades are NOT here — they live in
-- per-filing PDFs and are parsed in Phase 2 (house_trades). Public-read,
-- service-role write — same pattern as the other Capitol Watch dataset tables.

create table if not exists public.house_disclosure_filings (
  doc_id            text primary key,               -- DocID; also builds the PDF URL
  prefix            text,
  last_name         text not null,
  first_name        text not null,
  suffix            text,
  filing_type       text not null,                  -- P|A|C|X|W|D|T|H (raw code)
  filing_type_label text,                           -- human label derived on ingest
  state_dst         text,                           -- e.g. 'CA11'
  state             text,                           -- 'CA' (derived)
  district          text,                           -- '11' (derived)
  filing_year       int not null,
  filing_date       date,
  pdf_url           text,                           -- constructed from year + doc_id (PTRs)
  is_ptr            boolean not null default false,  -- filing_type = 'P'
  is_electronic     boolean,                        -- DocID heuristic: 9-digit 100/300 prefix
  trades_parsed     boolean not null default false,  -- Phase 2 sets this after a successful parse
  needs_ocr         boolean not null default false,  -- Phase 2: scanned PDF, no extractable text
  synced_at         timestamptz not null default now()
);
create index if not exists idx_hdf_year on public.house_disclosure_filings (filing_year desc);
create index if not exists idx_hdf_ptr on public.house_disclosure_filings (is_ptr, filing_date desc);
create index if not exists idx_hdf_name on public.house_disclosure_filings (last_name, first_name);

alter table public.house_disclosure_filings enable row level security;
drop policy if exists "public read house_disclosure_filings" on public.house_disclosure_filings;
create policy "public read house_disclosure_filings" on public.house_disclosure_filings for select using (true);
