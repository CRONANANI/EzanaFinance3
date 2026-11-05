-- Deep research (Nov 2026): company disclosures quoted from 10-Q and 10-K
-- filings. Written by /api/cron/ingest-disclosures; read by the deep
-- research `disclosures` reader. A row is stored only when its quote appears
-- in the filing word for word and every figure appears in the quote, so rows
-- arrive approved; review_status lets an admin reject one.
create table if not exists public.company_disclosures (
  id            bigserial primary key,
  ticker        text        not null,
  cik           text,
  accession_no  text        not null,
  form_type     text,
  filed_at      date,
  period_end    date,
  kind          text        not null
                check (kind in ('customer_concentration', 'export_risk', 'purchase_obligations')),
  quote         text        not null,
  quote_hash    text        generated always as (md5(quote)) stored,
  party         text,
  period_label  text,
  figures       jsonb       not null default '[]'::jsonb,
  source_url    text        not null,
  as_of         date        not null,
  review_status text        not null default 'approved'
                check (review_status in ('approved', 'pending', 'rejected')),
  extractor     text,
  created_at    timestamptz not null default now(),
  unique (accession_no, kind, quote_hash)
);
create index if not exists company_disclosures_ticker_kind_idx
  on public.company_disclosures (ticker, kind, period_end desc);

-- One row per filing processed, so a filing is read once.
create table if not exists public.company_disclosure_ingest (
  accession_no text primary key,
  ticker       text,
  form_type    text,
  sections     integer not null default 0,
  kept         integer not null default 0,
  dropped      integer not null default 0,
  processed_at timestamptz not null default now()
);

alter table public.company_disclosures enable row level security;
alter table public.company_disclosure_ingest enable row level security;
revoke all on public.company_disclosures from anon, authenticated;
revoke all on public.company_disclosure_ingest from anon, authenticated;
