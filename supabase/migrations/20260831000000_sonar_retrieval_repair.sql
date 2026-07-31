-- Sonar retrieval repair — echo_articles + prediction_market_index.
--
-- A production Vercel log for /api/sonar/query revealed three silent retrieval
-- failures (the request still returns 200 via graceful fallback):
--   GET  .../rest/v1/echo_articles           -> 400  (echo lexical: no `tsv` column)
--   POST .../rest/v1/rpc/match_echo_articles -> 404  (echo semantic RPC missing)
--   GET  .../rest/v1/prediction_market_index -> 400  (markets lexical: no `tsv` column)
-- This migration reconciles the schema the retrievers already expect.

-- Fix 3: echo_articles lexical full-text search — add generated tsvector + GIN index.
alter table public.echo_articles
  add column if not exists tsv tsvector
  generated always as (
    to_tsvector('english',
      coalesce(article_title, '') || ' ' ||
      coalesce(article_excerpt, '') || ' ' ||
      coalesce(article_body, '')
    )
  ) stored;

create index if not exists echo_articles_tsv_idx
  on public.echo_articles using gin (tsv);

-- Fix 2: echo_articles semantic search — the embedding column + match_echo_articles
-- RPC were missing (RPC 404'd). Add a 384-dim embedding column (gte-small) and the
-- RPC. No echo embedding backfill pipeline exists yet, so the semantic pass returns
-- [] gracefully until embeddings are populated; the lexical pass (above) carries
-- Echo in the meantime.
alter table public.echo_articles
  add column if not exists embedding vector(384);

create index if not exists echo_articles_embedding_idx
  on public.echo_articles using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Mirrors the working match_markets RPC (same param names/shape the retriever calls:
-- query_embedding, match_threshold, match_count).
create or replace function public.match_echo_articles(
  query_embedding vector,
  match_threshold double precision default 0.3,
  match_count integer default 6
)
returns table(
  id uuid,
  article_slug text,
  article_title text,
  article_excerpt text,
  article_category text,
  published_at timestamp with time zone,
  similarity double precision
)
language sql
stable
as $function$
  select
    a.id, a.article_slug, a.article_title, a.article_excerpt,
    a.article_category, a.published_at,
    1 - (a.embedding <=> query_embedding) as similarity
  from public.echo_articles a
  where a.embedding is not null
    and a.article_status = 'published'
    and 1 - (a.embedding <=> query_embedding) > match_threshold
  order by a.embedding <=> query_embedding
  limit match_count;
$function$;

-- Fix 4: prediction_market_index lexical full-text search — add generated tsvector +
-- GIN index. Its semantic pass (match_markets) already works; only the lexical
-- textSearch('tsv') 400'd because no `tsv` column existed.
alter table public.prediction_market_index
  add column if not exists tsv tsvector
  generated always as (
    to_tsvector('english',
      coalesce(question, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(category, '')
    )
  ) stored;

create index if not exists prediction_market_index_tsv_idx
  on public.prediction_market_index using gin (tsv);
