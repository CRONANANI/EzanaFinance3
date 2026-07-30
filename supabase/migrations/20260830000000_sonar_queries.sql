-- Ezana Sonar — per-query log. Backs the per-user daily quota (count today's rows)
-- and serves as an audit trail of what each ping searched. Writes happen via the
-- service role in the Sonar route; users may read only their own history.

create table if not exists public.sonar_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query_text text not null,
  classification text,
  version text,
  plan_tier int,
  datasets_searched jsonb not null default '[]'::jsonb,
  grounded boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.sonar_queries enable row level security;

drop policy if exists sonar_queries_select_own on public.sonar_queries;
create policy sonar_queries_select_own
  on public.sonar_queries for select
  using (auth.uid() = user_id);

create index if not exists sonar_queries_user_created_idx
  on public.sonar_queries (user_id, created_at desc);
