-- Sonar exemplary briefs: hand-reviewed answers in the evidence-led response
-- format, stored so retrieval can find them again for the question they answer.
--
-- NOT executed by the implementer. Noah applies it by hand in the SQL Editor.
-- Additive and idempotent; safe to run more than once.
--
-- Source and licence basis: the briefs are written in this repo
-- (src/lib/sonar/exemplary, the source of truth) from public primary sources
-- (SEC filings, issuer press releases), each cited inside the brief. This table
-- is the retrieval copy: /api/cron/index-sonar-exemplary embeds each brief's
-- question and its listed variants with gte-small (384-dim, the one vector
-- space every corpus shares) and upserts on slug.
--
-- A brief is a dated answer. verified_as_of is the day its sources were read;
-- review_after is the first day it should be read again before being trusted.
--
-- Service role only: the server reads it with the service-role client and the
-- page receives a brief through /api/sonar/landing-query, never from here.

create extension if not exists vector;

create table if not exists public.sonar_exemplary_briefs (
  slug            text primary key,
  version         int  not null default 1,
  template        text not null,                -- response format, e.g. 'event_impact'
  question        text not null,                -- the question the brief answers
  variants        text[] not null default '{}', -- other ways the same question is asked
  brief           jsonb not null,               -- the answer, as the page renders it
  verified_as_of  date not null,
  review_after    date,
  active          boolean not null default true,
  embedding       vector(384),                  -- gte-small of question + variants
  indexed_at      timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.sonar_exemplary_briefs enable row level security;
-- service role only: no anon or authenticated policies
revoke all on public.sonar_exemplary_briefs from anon, authenticated;

create index if not exists sonar_exemplary_briefs_template_idx
  on public.sonar_exemplary_briefs (template) where active;

-- Nearest stored questions to a ping, by cosine similarity. A handful of rows,
-- so a sequential scan is the right plan; add an ivfflat index if this grows
-- past a few thousand briefs.
create or replace function public.match_sonar_exemplary_briefs(
  query_embedding vector(384),
  match_threshold float default 0.8,
  match_count int default 3
)
returns table (
  slug text,
  template text,
  question text,
  verified_as_of date,
  similarity float
)
language sql
stable
as $$
  select
    b.slug, b.template, b.question, b.verified_as_of,
    1 - (b.embedding <=> query_embedding) as similarity
  from public.sonar_exemplary_briefs b
  where b.active
    and b.embedding is not null
    and 1 - (b.embedding <=> query_embedding) > match_threshold
  order by b.embedding <=> query_embedding
  limit match_count;
$$;

revoke all on function public.match_sonar_exemplary_briefs(vector, float, int)
  from public, anon, authenticated;
grant execute on function public.match_sonar_exemplary_briefs(vector, float, int)
  to service_role;
