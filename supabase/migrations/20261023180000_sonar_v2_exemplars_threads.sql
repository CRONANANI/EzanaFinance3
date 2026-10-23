-- Sonar v2: few-shot exemplar library and follow-up threads
-- (sonar-templates-spec.md §4 and §5).
--
-- NOT executed by the implementer. Noah applies it by hand in the SQL Editor.
-- Additive and idempotent; safe to run more than once.
--
-- sonar_exemplars: curated example answers per template. Exemplars teach
-- structure, tone and citation style, never facts: every number in
-- ideal_output is a {{placeholder}}. Service role only; the app also ships a
-- seed library in code (src/lib/sonar/exemplar-seeds.js) used while this
-- table is empty. query_embedding is filled by the admin promotion flow when
-- an embedding key is configured; retrieval falls back to quality_score.

create extension if not exists vector;

create table if not exists public.sonar_exemplars (
  id uuid primary key default gen_random_uuid(),
  template text not null,
  query text not null,
  query_embedding vector(1536),
  input_digest jsonb not null default '{}'::jsonb, -- trimmed example of swept data
  ideal_output jsonb not null,                     -- schema-valid example answer (placeholders)
  quality_score int not null default 5,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.sonar_exemplars enable row level security;
-- service role only: no anon/auth policies
revoke all on public.sonar_exemplars from anon, authenticated;
create index if not exists sonar_exemplars_tpl_idx
  on public.sonar_exemplars (template) where active;

-- sonar_threads: one row per v2 ping, chained by parent_id so a follow-up
-- inherits the parent's resolved entities ("top 10 companies" after "steel
-- in Canada" resolves to ranking{steel, CA}). Owner-only RLS; the server
-- writes with the service role.
create table if not exists public.sonar_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.sonar_threads (id) on delete set null,
  query text not null,
  template text not null,
  entities jsonb not null default '{}'::jsonb,
  briefing jsonb,
  created_at timestamptz not null default now()
);
alter table public.sonar_threads enable row level security;
do $$ begin
  create policy "own threads" on public.sonar_threads
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
revoke insert, update, delete on public.sonar_threads from anon, authenticated;
create index if not exists sonar_threads_user_idx
  on public.sonar_threads (user_id, created_at desc);
create index if not exists sonar_threads_parent_idx
  on public.sonar_threads (parent_id);
