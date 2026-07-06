-- Semantic Polymarket matching: a periodically-rebuilt vector index of active
-- markets. The index-polymarket cron embeds each market's question+description
-- (OpenAI text-embedding-3-small, 1536-dim) and upserts here; findMatchingMarkets
-- does a pgvector nearest-neighbour query against an article's embedding. NO mock
-- data — rows come only from live Gamma markets.
create extension if not exists vector;

create table if not exists public.polymarket_market_index (
  market_id    text primary key,
  question     text,
  description   text,
  group_slug   text,
  event_slug   text,
  slug         text,
  volume       double precision default 0,
  volume24hr   double precision default 0,
  liquidity    double precision default 0,
  end_date     timestamptz,
  yes_price    double precision,
  icon         text,
  category     text,
  tags         text[],
  active       boolean not null default true,
  embedding    vector(1536),
  embed_model  text,
  indexed_at   timestamptz not null default now()
);

alter table public.polymarket_market_index enable row level security;
drop policy if exists "public read pmi" on public.polymarket_market_index;
create policy "public read pmi" on public.polymarket_market_index for select using (true);
revoke insert, update, delete on public.polymarket_market_index from anon, authenticated;
grant select on public.polymarket_market_index to anon, authenticated;

-- HNSW cosine index — good recall without a rebuild as the index grows.
create index if not exists idx_pmi_embedding
  on public.polymarket_market_index using hnsw (embedding vector_cosine_ops);
create index if not exists idx_pmi_active_end on public.polymarket_market_index (active, end_date);

-- Nearest-neighbour search: cosine similarity over the live, tradeable, unresolved
-- markets, gated by a similarity threshold and a minimum volume floor. Returns the
-- metadata findMatchingMarkets needs to format a market row (no embedding).
create or replace function public.match_polymarket_markets(
  query_embedding vector(1536),
  match_threshold double precision default 0.78,
  match_count int default 10,
  min_volume double precision default 0
)
returns table (
  market_id text, question text, description text, group_slug text, event_slug text, slug text,
  volume double precision, volume24hr double precision, liquidity double precision,
  end_date timestamptz, yes_price double precision, icon text, category text, tags text[],
  similarity double precision
)
language sql
stable
as $$
  select m.market_id, m.question, m.description, m.group_slug, m.event_slug, m.slug,
         m.volume, m.volume24hr, m.liquidity, m.end_date, m.yes_price, m.icon, m.category, m.tags,
         1 - (m.embedding <=> query_embedding) as similarity
  from public.polymarket_market_index m
  where m.active
    and m.embedding is not null
    and (m.end_date is null or m.end_date > now())
    and m.volume >= min_volume
    and 1 - (m.embedding <=> query_embedding) >= match_threshold
  order by m.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_polymarket_markets(vector, double precision, int, double precision)
  to anon, authenticated, service_role;
