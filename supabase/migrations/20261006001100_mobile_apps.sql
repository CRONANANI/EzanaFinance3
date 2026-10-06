-- Native push tokens (APNs via FCM, and FCM), one row per device.
create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  token text not null unique check (char_length(token) between 10 and 4096),
  app_version text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists device_push_tokens_user_idx on public.device_push_tokens (user_id) where enabled;

-- User-generated content: reports and blocks (App Store 1.2, Google Play UGC policy).
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  content_type text not null check (content_type in ('community_post', 'echo_comment', 'message', 'profile')),
  content_id uuid not null,
  reported_user_id uuid references auth.users (id) on delete set null,
  reason text not null check (reason in ('spam', 'harassment', 'hate', 'sexual', 'violence', 'misinformation', 'illegal', 'other')),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  action text check (action is null or action in ('hidden', 'user_suspended', 'none')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, content_type, content_id)
);
create index if not exists content_reports_status_idx on public.content_reports (status, created_at);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

-- Moderation hides content without deleting it.
alter table public.community_posts add column if not exists moderation_hidden_at timestamptz;
alter table public.echo_article_comments add column if not exists moderation_hidden_at timestamptz;
alter table public.messages add column if not exists moderation_hidden_at timestamptz;

-- Where a subscription was bought, and community terms acceptance (shown before first post).
alter table public.profiles
  add column if not exists subscription_source text
    check (subscription_source is null or subscription_source in ('stripe', 'apple', 'google')),
  add column if not exists community_terms_accepted_at timestamptz;

alter table public.device_push_tokens enable row level security;
alter table public.content_reports enable row level security;
alter table public.user_blocks enable row level security;

drop policy if exists "content_reports_insert_own" on public.content_reports;
create policy "content_reports_insert_own" on public.content_reports
  for insert to authenticated with check ((select auth.uid()) = reporter_id);
drop policy if exists "content_reports_select_own" on public.content_reports;
create policy "content_reports_select_own" on public.content_reports
  for select to authenticated using ((select auth.uid()) = reporter_id);

drop policy if exists "user_blocks_own" on public.user_blocks;
create policy "user_blocks_own" on public.user_blocks
  for all to authenticated
  using ((select auth.uid()) = blocker_id)
  with check ((select auth.uid()) = blocker_id);

revoke all on public.device_push_tokens from anon, authenticated;
revoke all on public.content_reports, public.user_blocks from anon;
grant select, insert on public.content_reports to authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
