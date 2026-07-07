-- Semantic prediction-market matching (Adjacent-style): a pgvector index of
-- active markets embedded with Supabase's built-in gte-small model (384 dims).
-- The index-prediction-markets cron populates it; /api/market-data/related-markets
-- embeds an article and nearest-neighbour queries it via match_markets. Distinct
-- from polymarket_market_index (that one is OpenAI 1536-dim, a different surface).
create extension if not exists vector;

create table if not exists public.prediction_market_index (
  market_id      text primary key,        -- venue-native id
  adj_ticker     text,                    -- canonical cross-venue id (MappedMarket)
  platform       text not null,           -- polymarket | kalshi | ...
  question       text not null,
  description    text,
  probability    numeric,                 -- implied YES odds (0..1)
  volume         numeric,
  liquidity      numeric,
  end_date       timestamptz,
  status         text,
  link           text,                    -- deep link to trade on venue
  category       text,
  embedding      vector(384),             -- gte-small = 384 dims
  indexed_at     timestamptz not null default now()
);

-- ANN index for fast nearest-neighbour
create index if not exists idx_pmi_embedding
  on public.prediction_market_index
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index if not exists idx_pmi_active
  on public.prediction_market_index (status, end_date);

alter table public.prediction_market_index enable row level security;
drop policy if exists "public read pmi" on public.prediction_market_index;
create policy "public read pmi" on public.prediction_market_index for select using (true);
revoke insert, update, delete on public.prediction_market_index from anon, authenticated;
grant select on public.prediction_market_index to anon, authenticated;
