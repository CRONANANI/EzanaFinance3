-- Chunk-level RAG index for Echo articles. Retrieval precision from small units,
-- synthesis context from parents (see RAG_SYSTEM.md §3 Phase 1). Additive:
-- article-level embedding + match_echo_articles remain the fallback path.
-- Chunking: heading-aware, target ~500 tokens (~2000 chars), ~50-token
-- (~200-char) overlap, never mid-sentence. Rationale: heading boundaries keep
-- chunks topically coherent for gte-small; overlap preserves cross-boundary
-- references; 500 tokens sits inside gte-small's effective context.
create extension if not exists vector;

create table if not exists public.echo_article_chunks (
  id              bigint generated always as identity primary key,
  article_id      uuid not null references public.echo_articles(id) on delete cascade,
  chunk_index     int  not null,
  section_anchor  text,                          -- heading slug; deep-link citation unit
  section_title   text,
  content         text not null,
  token_estimate  int,
  tsv             tsvector generated always as (to_tsvector('english', coalesce(content, ''))) stored,
  embedding       vector(384),
  indexed_at      timestamptz not null default now(),
  unique (article_id, chunk_index)
);

create index if not exists idx_eac_embedding
  on public.echo_article_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists idx_eac_tsv on public.echo_article_chunks using gin (tsv);
create index if not exists idx_eac_article on public.echo_article_chunks (article_id);

alter table public.echo_article_chunks enable row level security;
drop policy if exists "public read echo_article_chunks" on public.echo_article_chunks;
create policy "public read echo_article_chunks"
  on public.echo_article_chunks for select using (true);
revoke insert, update, delete on public.echo_article_chunks from anon, authenticated;
grant select on public.echo_article_chunks to anon, authenticated;

-- Chunk-level match over PUBLISHED articles only; joins parent metadata so the
-- retriever hydrates without a second round trip.
create or replace function public.match_echo_chunks(
  query_embedding vector(384),
  match_threshold float default 0.3,
  match_count int default 12
)
returns table (
  chunk_id bigint, article_id uuid, chunk_index int,
  section_anchor text, section_title text, content text,
  slug text, title text, category text, published_at timestamptz,
  similarity float
)
language sql stable as $$
  select
    c.id, c.article_id, c.chunk_index, c.section_anchor, c.section_title, c.content,
    a.article_slug, a.article_title, a.article_category, a.published_at,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.echo_article_chunks c
  join public.echo_articles a on a.id = c.article_id
  where c.embedding is not null
    and a.article_status = 'published'
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_echo_chunks(vector, float, int)
  to anon, authenticated, service_role;
