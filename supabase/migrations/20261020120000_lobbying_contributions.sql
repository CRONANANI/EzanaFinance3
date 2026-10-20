-- Lobbying: LD-203 contribution reports, and ticker provenance.
-- Additive and idempotent.
--
-- 1. lobbying_client_tickers.source: where a client-to-ticker row came from.
--    'curated' for the hand-checked rows already there; 'quiver' for pairs
--    harvested once from Quiver's lobbying feed by
--    /api/cron/harvest-lobbying-tickers before that feed is retired.
-- 2. LD-203 contribution reports (twice a year, every registrant and every
--    active lobbyist) from lda.gov /contributions/, one row per report, and
--    their itemised contributions, one row per item. Written by
--    /api/cron/ingest-lobbying-contributions, read by /api/lobbying/contributions.
-- 3. lobbying_contribution_ingest_state: the per-period resume cursor.
--
-- The new tables are service-role only (RLS on, no policies), like
-- prediction_market_snapshots: the server reads them with the admin client.

alter table public.lobbying_client_tickers
  add column if not exists source text not null default 'curated';

comment on column public.lobbying_client_tickers.source is
  'curated = hand-checked; quiver = harvested from Quiver''s lobbying feed (their client-to-ticker mapping).';

create table if not exists public.lobbying_contribution_reports (
  filing_uuid       text primary key,
  filing_year       integer not null,
  filing_period     text not null,          -- 'mid_year' | 'year_end'
  filing_type       text,                   -- 'MM' mid-year, 'YY' year-end, amendments 'MA' / 'YA'
  dt_posted         timestamptz,
  filer_type        text,                   -- 'lobbyist' | 'organization'
  registrant_id     bigint,
  registrant_name   text,
  lobbyist_id       bigint,
  lobbyist_name     text,                   -- 'FIRST MIDDLE LAST', null for organization filers
  no_contributions  boolean not null default false,
  pacs              text[],
  item_count        integer not null default 0,
  total_amount      numeric not null default 0,
  document_url      text,
  synced_at         timestamptz not null default now()
);

create index if not exists lcr_period_idx
  on public.lobbying_contribution_reports (filing_year, filing_period);
create index if not exists lcr_posted_idx
  on public.lobbying_contribution_reports (dt_posted desc);
create index if not exists lcr_registrant_idx
  on public.lobbying_contribution_reports (registrant_id);
create index if not exists lcr_lobbyist_idx
  on public.lobbying_contribution_reports (lobbyist_id);

create table if not exists public.lobbying_contribution_items (
  filing_uuid        text not null references public.lobbying_contribution_reports (filing_uuid) on delete cascade,
  item_index         integer not null,
  contribution_type  text,                  -- 'feca' | 'he' | 'me' | 'ple' | 'pic' (lda.gov item types)
  contributor_name   text,                  -- 'SELF' or the PAC / person who gave
  payee_name         text,                  -- the committee or entity paid
  honoree_name       text,                  -- the member or official honoured, free text as filed
  amount             numeric,
  contribution_date  date,
  primary key (filing_uuid, item_index)
);

create index if not exists lci_honoree_idx
  on public.lobbying_contribution_items (lower(honoree_name));
create index if not exists lci_payee_idx
  on public.lobbying_contribution_items (lower(payee_name));
create index if not exists lci_date_idx
  on public.lobbying_contribution_items (contribution_date desc);
create index if not exists lci_amount_idx
  on public.lobbying_contribution_items (amount desc);

create table if not exists public.lobbying_contribution_ingest_state (
  filing_year     integer not null,
  filing_period   text not null,
  total_count     integer,
  last_page       integer not null default 0,
  last_page_rows  integer not null default 0,   -- rows on last_page when last read; it is re-read next run
  rows_fetched    integer not null default 0,   -- rows returned on pages 1..last_page
  reports_upserted integer not null default 0,
  items_upserted  integer not null default 0,
  complete        boolean not null default false,
  last_seen_posted timestamptz,
  last_run_at     timestamptz,
  last_status     text,
  last_reason     text,
  updated_at      timestamptz not null default now(),
  primary key (filing_year, filing_period)
);

alter table public.lobbying_contribution_reports enable row level security;
alter table public.lobbying_contribution_items enable row level security;
alter table public.lobbying_contribution_ingest_state enable row level security;
revoke all on public.lobbying_contribution_reports from anon, authenticated;
revoke all on public.lobbying_contribution_items from anon, authenticated;
revoke all on public.lobbying_contribution_ingest_state from anon, authenticated;
