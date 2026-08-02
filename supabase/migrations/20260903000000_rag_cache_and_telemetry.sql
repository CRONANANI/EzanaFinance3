-- Query-embedding cache (RAG_SYSTEM.md §3 P5): help-center + Sonar queries
-- repeat heavily; skip the edge-function round trip on repeats.
create extension if not exists vector;

create table if not exists public.query_embedding_cache (
  query_hash  text primary key,          -- sha256 of normalized query text
  embedding   vector(384) not null,
  hit_count   int not null default 1,
  created_at  timestamptz not null default now(),
  last_hit_at timestamptz not null default now()
);
-- Zero-result telemetry: these queries are the corpus's content gaps.
create table if not exists public.rag_zero_results (
  id bigint generated always as identity primary key,
  surface text not null,                 -- 'help-center' | 'copilot' | 'sonar'
  query text not null,
  created_at timestamptz not null default now()
);
alter table public.query_embedding_cache enable row level security;
alter table public.rag_zero_results enable row level security;
-- service-role only: no policies, no grants to anon/authenticated.

-- Atomic cache-hit bump (hit_count + last_hit_at) — called fire-and-forget on a hit.
create or replace function public.increment_query_cache_hit(p_hash text)
returns void
language sql
as $$
  update public.query_embedding_cache
    set hit_count = hit_count + 1, last_hit_at = now()
    where query_hash = p_hash;
$$;
grant execute on function public.increment_query_cache_hit(text) to service_role;

-- Bounded cache: keep the most-hit / most-recent `keep` rows, evict the rest.
-- Called best-effort from a daily indexer cron.
create or replace function public.evict_query_embedding_cache(keep int default 5000)
returns integer
language plpgsql
as $$
declare
  removed integer;
begin
  with keepers as (
    select query_hash from public.query_embedding_cache
    order by hit_count desc, last_hit_at desc
    limit keep
  )
  delete from public.query_embedding_cache c
  where not exists (select 1 from keepers k where k.query_hash = c.query_hash);
  get diagnostics removed = row_count;
  return removed;
end;
$$;
grant execute on function public.evict_query_embedding_cache(int) to service_role;
