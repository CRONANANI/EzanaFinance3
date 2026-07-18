-- Bring Echo articles to semantic-retrieval parity with the other corpora so the
-- research copilot can retrieve across them. echo_articles had no embedding
-- column and no match RPC; add both (gte-small 384-dim, cosine/ivfflat, mirroring
-- prediction_market_index / match_markets). The index-echo-articles cron embeds
-- published articles; the copilot's echo retriever calls match_echo_articles.
create extension if not exists vector;

alter table public.echo_articles
  add column if not exists embedding vector(384),
  add column if not exists embedded_at timestamptz;

create index if not exists idx_echo_articles_embedding
  on public.echo_articles
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Nearest-neighbour match over PUBLISHED Echo articles only (drafts/rejected are
-- never retrievable). Cosine similarity above a threshold, top-k.
create or replace function public.match_echo_articles(
  query_embedding vector(384),
  match_threshold float default 0.3,
  match_count int default 6
)
returns table (
  id uuid,
  slug text,
  title text,
  excerpt text,
  category text,
  published_at timestamptz,
  similarity float
)
language sql
stable
as $$
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
$$;

grant execute on function public.match_echo_articles(vector, float, int)
  to anon, authenticated, service_role;
