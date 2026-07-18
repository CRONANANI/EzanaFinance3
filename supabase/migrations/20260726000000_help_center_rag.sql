-- Help-center RAG corpus: an embedded, audience-scoped index of the help-center
-- articles (source of truth stays src/lib/help-center-content.js). The
-- index-help-center cron strips each article's HTML, embeds title+body with
-- Supabase's built-in gte-small model (384-dim), and upserts on (audience, slug).
-- /api/help-center/ask embeds the user's question and nearest-neighbour queries
-- this table via match_help_articles to ground a cited answer.
--
-- 384-dim / ivfflat / cosine, mirroring prediction_market_index + match_markets.
create extension if not exists vector;

create table if not exists public.help_center_articles (
  audience    text not null,             -- 'user' | 'partner'
  slug        text not null,             -- article slug (object key in help-center-content)
  title       text not null,
  category    text,                      -- human-readable category title
  url         text,                      -- /help-center/{audience}/article/{slug}
  content     text,                      -- plain-text body (HTML stripped) for grounding
  embedding   vector(384),               -- gte-small = 384 dims (title + body)
  indexed_at  timestamptz not null default now(),
  primary key (audience, slug)
);

-- ANN index for fast nearest-neighbour retrieval.
create index if not exists idx_hca_embedding
  on public.help_center_articles
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index if not exists idx_hca_audience
  on public.help_center_articles (audience);

-- Public marketing corpus: world-readable, writes locked to the service role
-- (the cron upserts with the service-role key, which bypasses RLS).
alter table public.help_center_articles enable row level security;
drop policy if exists "public read help_center_articles" on public.help_center_articles;
create policy "public read help_center_articles"
  on public.help_center_articles for select using (true);
revoke insert, update, delete on public.help_center_articles from anon, authenticated;
grant select on public.help_center_articles to anon, authenticated;

-- Nearest-neighbour match, audience-scoped. Cosine similarity above a threshold,
-- top-k. match_audience null = search both slices. Mirrors match_markets.
create or replace function public.match_help_articles(
  query_embedding vector(384),
  match_audience text default null,
  match_threshold float default 0.3,
  match_count int default 6
)
returns table (
  audience text,
  slug text,
  title text,
  category text,
  url text,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    a.audience, a.slug, a.title, a.category, a.url, a.content,
    1 - (a.embedding <=> query_embedding) as similarity
  from public.help_center_articles a
  where a.embedding is not null
    and (match_audience is null or a.audience = match_audience)
    and 1 - (a.embedding <=> query_embedding) > match_threshold
  order by a.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_help_articles(vector, text, float, int)
  to anon, authenticated, service_role;
