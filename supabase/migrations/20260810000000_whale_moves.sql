-- Whale Moves — Ezana's composite-scored institutional & activist signal.
-- DERIVED from sec_13f_holdings / sec_activist_positions (see sec_filings) by the
-- compute-whale-moves cron, which joins each filing against the filer's prior
-- quarter and runs src/lib/whale-score.js. Not scored at read time (it needs the
-- prior-quarter join). Public-read, service-role write — same pattern as the
-- other dataset tables. whale_score is Ezana's own composite, NOT an SEC figure.
create table if not exists public.whale_moves (
  id               bigint generated always as identity primary key,
  kind             text not null check (kind in ('institutional', 'activist')),
  filer_name       text not null,
  filer_cik        text,
  ticker           text,
  issuer           text,
  accession_no     text references public.sec_filings(accession_no) on delete cascade,
  quarter          text,                          -- 'CY2026Q1'
  value_usd        numeric,
  conviction_pct   numeric,                       -- % of filer's own portfolio
  change_type      text,                          -- new|added|doubled|trimmed|exited|flat
  percent_of_class numeric,                       -- activist
  form             text,                          -- SC 13D | SC 13G
  whale_score      numeric not null,
  tier             text,
  factors          jsonb,                         -- the score breakdown, for the UI
  filed_at         timestamptz,
  synced_at        timestamptz not null default now()
);
create index if not exists idx_whale_score on public.whale_moves (whale_score desc);
create index if not exists idx_whale_kind_score on public.whale_moves (kind, whale_score desc);
create index if not exists idx_whale_ticker on public.whale_moves (ticker);
create index if not exists idx_whale_accession on public.whale_moves (accession_no);

-- public read, service-role write (same pattern as the other dataset tables)
alter table public.whale_moves enable row level security;
drop policy if exists "public read whale_moves" on public.whale_moves;
create policy "public read whale_moves" on public.whale_moves for select using (true);
