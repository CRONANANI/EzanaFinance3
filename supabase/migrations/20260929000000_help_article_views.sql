-- Help Center article views: one row per page view, aggregated for the
-- "Trending articles" rail on /help-center/user and /help-center/partner.
-- Written only by POST /api/help-center/view (service role); no client reads.
-- Aggregation only through the security-definer RPC below.
--
-- NOT applied by CI or by Claude: apply manually in the SQL Editor.

create table if not exists public.help_article_views (
  id bigint generated always as identity primary key,
  section text not null check (section in ('user', 'partner')),
  article_slug text not null,
  viewed_at timestamptz not null default now()
);

create index if not exists help_article_views_section_time_idx
  on public.help_article_views (section, viewed_at desc);

alter table public.help_article_views enable row level security;
revoke all on public.help_article_views from anon, authenticated;

create or replace function public.help_center_trending(
  p_section text,
  p_days int default 30,
  p_limit int default 6
)
returns table (article_slug text, views bigint)
language sql
stable
security definer
set search_path = public
as $$
  select article_slug, count(*)::bigint as views
  from public.help_article_views
  where section = p_section
    and viewed_at >= now() - make_interval(days => greatest(p_days, 1))
  group by article_slug
  order by views desc, article_slug
  limit greatest(least(p_limit, 20), 1);
$$;

revoke all on function public.help_center_trending(text, int, int) from public;
grant execute on function public.help_center_trending(text, int, int) to anon, authenticated, service_role;

-- Optional retention: keep 180 days. Wire to an existing cleanup cron if one exists:
--   delete from public.help_article_views where viewed_at < now() - interval '180 days';
