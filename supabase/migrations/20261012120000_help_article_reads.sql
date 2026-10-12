-- Help centre: which Start here articles a member has read. Additive and
-- idempotent. One row per (member, article); RLS lets a member read and
-- insert only their own rows. Apply in the Supabase SQL editor.

create table if not exists public.help_article_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  article_slug text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, article_slug)
);

alter table public.help_article_reads enable row level security;

do $$ begin
  create policy "read own help reads" on public.help_article_reads
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "insert own help reads" on public.help_article_reads
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
