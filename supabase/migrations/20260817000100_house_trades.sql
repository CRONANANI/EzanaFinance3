-- Phase 2: parsed trades from ELECTRONIC House PTR PDFs (is_ptr AND is_electronic).
-- Amounts are STOCK Act brackets — a range, never an exact figure. amount_midpoint
-- is a labeled estimate for sorting only. Scanned (short-DocID) filings are not
-- here; they're flagged needs_ocr on house_disclosure_filings and deferred to OCR.

create table if not exists public.house_trades (
  id                   bigint generated always as identity primary key,
  doc_id               text not null references public.house_disclosure_filings(doc_id) on delete cascade,
  last_name            text,
  first_name           text,
  state_dst            text,
  ticker               text,                 -- null when the asset isn't a listed security
  asset_name           text not null,
  tx_type              text,                 -- 'P'(urchase) | 'S'(ale) | 'E'(xchange)
  tx_date              date,
  notification_date    date,
  amount_low           numeric,              -- bracket floor
  amount_high          numeric,              -- bracket ceiling (null = open-ended top)
  amount_midpoint      numeric,              -- (low+high)/2 — ESTIMATE for sorting only
  amount_bracket_label text,                 -- e.g. '$1,001 - $15,000' as filed
  raw_row              text,                 -- the parsed source line, for audit
  synced_at            timestamptz not null default now()
);
create index if not exists idx_ht_doc on public.house_trades (doc_id);
create index if not exists idx_ht_ticker on public.house_trades (ticker);
create index if not exists idx_ht_date on public.house_trades (tx_date desc);

alter table public.house_trades enable row level security;
drop policy if exists "public read house_trades" on public.house_trades;
create policy "public read house_trades" on public.house_trades for select using (true);
