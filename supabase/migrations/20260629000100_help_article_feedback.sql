-- Help Center article feedback: thumbs up/down + optional short comment.
-- Public can submit (help pages are public, anonymous allowed). Feedback is
-- private: only the owner can read/update their own rows — no public listing.
-- -----------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create table if not exists public.help_article_feedback (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('user', 'partner')),
  article_slug text not null,
  user_id uuid references auth.users(id) on delete set null,
  rating text not null check (rating in ('up', 'down')),
  comment text check (comment is null or char_length(comment) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One vote per logged-in user per article (so changing a vote upserts).
-- Anonymous rows (user_id null) are exempt from the constraint.
create unique index if not exists help_article_feedback_user_unique
  on public.help_article_feedback (section, article_slug, user_id)
  where user_id is not null;

create index if not exists help_article_feedback_article_idx
  on public.help_article_feedback (section, article_slug);

alter table public.help_article_feedback enable row level security;

-- Anyone (including anon) may submit feedback.
drop policy if exists "help_feedback_insert_any" on public.help_article_feedback;
create policy "help_feedback_insert_any" on public.help_article_feedback
  for insert with check (true);

-- Owners may read only their own feedback (no public listing of comments).
drop policy if exists "help_feedback_select_own" on public.help_article_feedback;
create policy "help_feedback_select_own" on public.help_article_feedback
  for select using (auth.uid() = user_id);

-- Owners may update their own feedback (change vote / comment).
drop policy if exists "help_feedback_update_own" on public.help_article_feedback;
create policy "help_feedback_update_own" on public.help_article_feedback
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
