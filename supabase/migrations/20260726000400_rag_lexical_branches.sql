-- Lexical (keyword) branch for the RAG corpora. Every semantic retriever runs
-- BOTH a vector pass (match_* RPC, gte-small cosine) AND a lexical pass, then
-- merges — because exact tokens (tickers, PIIDs/award IDs, proper names) are
-- where embeddings underperform and full-text/trigram wins. This adds a STORED
-- tsvector generated column + GIN index to each semantic corpus; the retrievers
-- query it via Supabase .textSearch(). Additive + idempotent.
create extension if not exists pg_trgm;

-- Help-center articles (title + plain-text body).
alter table public.help_center_articles
  add column if not exists tsv tsvector
  generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) stored;
create index if not exists idx_hca_tsv
  on public.help_center_articles using gin (tsv);
create index if not exists idx_hca_title_trgm
  on public.help_center_articles using gin (title gin_trgm_ops);

-- Echo articles (title + excerpt + body).
alter table public.echo_articles
  add column if not exists tsv tsvector
  generated always as (
    to_tsvector(
      'english',
      coalesce(article_title, '') || ' ' ||
      coalesce(article_excerpt, '') || ' ' ||
      coalesce(article_body, '')
    )
  ) stored;
create index if not exists idx_echo_tsv
  on public.echo_articles using gin (tsv);

-- Prediction markets (question + description).
alter table public.prediction_market_index
  add column if not exists tsv tsvector
  generated always as (
    to_tsvector('english', coalesce(question, '') || ' ' || coalesce(description, ''))
  ) stored;
create index if not exists idx_pmi_tsv
  on public.prediction_market_index using gin (tsv);
