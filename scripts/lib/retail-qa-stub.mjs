/**
 * Stub of the live objects the Retail-B migrations (20261026110000,
 * 20261026130000, 20261026131000) touch, for scripts/lib/pg-harness.mjs.
 * Fold into STUB_SCHEMA so check-rls / check-reliability-sql can apply them.
 */
/* Live shapes (read-only catalog check, 2026-10-25) with the live policies
   these migrations replace. Idempotent, so it can run after STUB_SCHEMA
   even once folded into it. */
export const RETAIL_STUB = `
create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;
create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text, owner uuid, created_at timestamptz default now()
);
alter table storage.objects enable row level security;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
create or replace function storage.foldername(name text) returns text[]
  language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;

create table if not exists public.mock_portfolios (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique,
  portfolio jsonb default '{}'::jsonb, updated_at timestamptz default now()
);
alter table public.mock_portfolios enable row level security;
drop policy if exists "Users manage own mock portfolio" on public.mock_portfolios;
create policy "Users manage own mock portfolio" on public.mock_portfolios
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.mock_trades enable row level security;
drop policy if exists "Users insert own mock trades" on public.mock_trades;
create policy "Users insert own mock trades" on public.mock_trades
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users read own mock trades" on public.mock_trades;
create policy "Users read own mock trades" on public.mock_trades
  for select using (auth.uid() = user_id);
create table if not exists public.user_course_progress (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, course_id text,
  status text default 'not_started', quiz_passed boolean, unique (user_id, course_id)
);
alter table public.user_course_progress enable row level security;
drop policy if exists "Users own course progress" on public.user_course_progress;
create policy "Users own course progress" on public.user_course_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create table if not exists public.user_learning_badges (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, badge_key text,
  earned_at timestamptz default now(), unique (user_id, badge_key)
);
alter table public.user_learning_badges enable row level security;
drop policy if exists "Users own learning badges" on public.user_learning_badges;
create policy "Users own learning badges" on public.user_learning_badges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, content text,
  parent_post_id uuid, created_at timestamptz default now()
);
alter table public.community_posts enable row level security;
drop policy if exists "Anyone can read posts" on public.community_posts;
create policy "Anyone can read posts" on public.community_posts for select using (true);
drop policy if exists "Users can create posts" on public.community_posts;
create policy "Users can create posts" on public.community_posts
  for insert with check (auth.uid() = user_id);
`;
