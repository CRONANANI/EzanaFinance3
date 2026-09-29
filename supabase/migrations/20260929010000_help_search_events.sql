-- Help Center search events: what people ask, which article they open from a
-- search, and thumbs up/down on AI answers, so unanswered questions are
-- visible. Written only by POST /api/help-center/search-event (service role);
-- read only through the service role. Not applied by CI or by Claude: apply manually in
-- the SQL Editor.

create table if not exists public.help_search_events (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('ask', 'click', 'feedback')),
  section text not null check (section in ('user', 'partner')),
  question text check (char_length(question) <= 300),
  top_slug text,
  clicked_slug text,
  answered boolean,
  helpful boolean,
  created_at timestamptz not null default now()
);

create index if not exists help_search_events_kind_time_idx
  on public.help_search_events (kind, created_at desc);

alter table public.help_search_events enable row level security;
revoke all on public.help_search_events from anon, authenticated;

-- No select policy: admins are identified in app code (isAdminUser in
-- src/lib/admin-helpers.js), not by a database role, so reads go through a
-- service-role admin endpoint, as platform_changelog writes do.
