-- Community v3 (Nov 23, 2026): research post types, safe attachments,
-- filtered + sorted feed, community sessions with RSVP, contributor ranking.
-- Additive and idempotent. The app degrades gracefully until this is applied:
-- the feed falls back to community_feed, Events and Top contributors show
-- empty states, and new post types are stored as plain discussions.

-- 1. Post types: the partner formats stay; research types for every member;
--    product and announcement are admin-only (enforced in the API).
alter table public.community_posts drop constraint if exists community_posts_post_type_check;
alter table public.community_posts add constraint community_posts_post_type_check check (
  post_type is null or post_type = any (array[
    'analyst_take','trade_idea','market_brief',
    'discussion','research','thesis','data_insight','question',
    'sonar_share','echo_discussion','product','announcement'
  ])
);

-- 2. A safe, public preview of what a post links to (a shared Sonar report,
--    an Echo article). Written only by the API after it checks ownership and
--    sharing; never the private source object.
alter table public.community_posts add column if not exists attachment jsonb;

create index if not exists community_posts_type_created_idx
  on public.community_posts (post_type, created_at desc)
  where parent_post_id is null and moderation_hidden_at is null;
create index if not exists community_posts_top_created_idx
  on public.community_posts (created_at desc)
  where parent_post_id is null and moderation_hidden_at is null;

-- 3. The v3 feed: filter by post kind (null post_type reads as 'discussion'),
--    sort by relevance, recency, trending or discussion. Runs as the caller
--    (RLS applies), like community_feed.
create or replace function public.community_feed_v3(
  p_sort text default 'relevant',
  p_kinds text[] default null,
  p_topic text default null,
  p_offset integer default 0,
  p_limit integer default 20
)
returns table(
  id uuid, user_id uuid, title text, content text, topic_slug text, topic_label text,
  mentioned_ticker text, image_url text, post_type text, attachment jsonb,
  likes_count integer, comments_count integer, reposts_count integer,
  created_at timestamptz, liked_by_me boolean, saved_by_me boolean
)
language sql stable
set search_path to 'public'
as $$
  with mine as (
    select
      array(select f.following_id from user_follows f where f.follower_id = auth.uid()) as authors,
      array(select tf.topic_slug from community_topic_follows tf where tf.user_id = auth.uid()) as topics
  )
  select
    p.id, p.user_id,
    coalesce(p.title, left(split_part(p.content, E'\n', 1), 160)),
    p.content, p.topic_slug, t.label, p.mentioned_ticker, p.image_url, p.post_type, p.attachment,
    coalesce(p.likes_count, 0), coalesce(p.comments_count, 0), coalesce(p.reposts_count, 0),
    p.created_at,
    exists (select 1 from post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
    exists (select 1 from post_saves s where s.post_id = p.id and s.user_id = auth.uid())
  from community_posts p
  left join community_topics t on t.slug = p.topic_slug
  cross join mine
  where p.parent_post_id is null
    and p.moderation_hidden_at is null
    and (p_topic is null or p.topic_slug = p_topic)
    and (p_kinds is null or coalesce(p.post_type, 'discussion') = any (p_kinds))
    and (p_sort <> 'trending' or p.created_at >= now() - interval '7 days')
  order by
    case p_sort
      -- Relevant: recency decay, lifted for authors and topics the reader
      -- follows, with a damped engagement term (engagement alone never wins).
      when 'relevant' then
        (1.0
          + case when p.user_id = any (mine.authors) then 2 else 0 end
          + case when p.topic_slug = any (mine.topics) then 1 else 0 end
          + ln(1 + coalesce(p.likes_count, 0) + 2 * coalesce(p.comments_count, 0)))
        / power(extract(epoch from (now() - p.created_at)) / 3600.0 + 2, 1.2)
      when 'trending' then
        (coalesce(p.likes_count, 0) + 2 * coalesce(p.comments_count, 0) + 3 * coalesce(p.reposts_count, 0))::numeric
        / power(extract(epoch from (now() - p.created_at)) / 3600.0 + 2, 1.5)
      when 'discussed' then coalesce(p.comments_count, 0)::numeric
      else null
    end desc nulls last,
    p.created_at desc
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 50);
$$;
grant execute on function public.community_feed_v3(text, text[], text, integer, integer) to authenticated;

-- 4. Community sessions (research sessions, workshops, discussions) and RSVPs.
--    Created by admins with the service role; members register only through
--    community_session_rsvp(), which checks time, status and capacity.
create table if not exists public.community_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  description text,
  session_type text not null default 'research_session'
    check (session_type in ('research_session', 'workshop', 'discussion')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'America/New_York',
  capacity integer check (capacity is null or capacity > 0),
  join_url text,
  host_id uuid references auth.users(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index if not exists community_sessions_starts_idx on public.community_sessions (starts_at);
alter table public.community_sessions enable row level security;
drop policy if exists community_sessions_read on public.community_sessions;
create policy community_sessions_read on public.community_sessions
  for select to authenticated using (true);

create table if not exists public.community_session_rsvps (
  session_id uuid not null references public.community_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
alter table public.community_session_rsvps enable row level security;
drop policy if exists community_session_rsvps_own on public.community_session_rsvps;
create policy community_session_rsvps_own on public.community_session_rsvps
  for select to authenticated using (user_id = auth.uid());
-- No insert/update/delete policies: RSVPs change only through the function.

create or replace function public.community_sessions_list(p_scope text default 'upcoming', p_limit integer default 20)
returns table(
  id uuid, title text, description text, session_type text, starts_at timestamptz,
  ends_at timestamptz, timezone text, capacity integer, join_url text, status text,
  rsvp_count bigint, my_rsvp boolean
)
language sql stable security definer
set search_path to 'public'
as $$
  select s.id, s.title, s.description, s.session_type, s.starts_at, s.ends_at, s.timezone,
    s.capacity,
    -- The join link is shown only to registered members.
    case when exists (select 1 from community_session_rsvps r where r.session_id = s.id and r.user_id = auth.uid())
      then s.join_url end,
    s.status,
    (select count(*) from community_session_rsvps r where r.session_id = s.id),
    exists (select 1 from community_session_rsvps r where r.session_id = s.id and r.user_id = auth.uid())
  from community_sessions s
  where auth.uid() is not null
    and case when p_scope = 'past'
      then coalesce(s.ends_at, s.starts_at) < now()
      else coalesce(s.ends_at, s.starts_at) >= now() end
  order by case when p_scope = 'past' then null else s.starts_at end asc nulls last,
           s.starts_at desc
  limit least(greatest(p_limit, 1), 50);
$$;
grant execute on function public.community_sessions_list(text, integer) to authenticated;

create or replace function public.community_session_rsvp(p_session uuid, p_going boolean)
returns table(going boolean, rsvp_count bigint)
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_s community_sessions%rowtype;
  v_count bigint;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  -- Lock the session row so concurrent RSVPs cannot overrun capacity.
  select * into v_s from community_sessions where id = p_session for update;
  if not found then raise exception 'session_not_found'; end if;
  if p_going then
    if v_s.status <> 'scheduled' then raise exception 'session_cancelled'; end if;
    if v_s.starts_at <= now() then raise exception 'session_started'; end if;
    if v_s.capacity is not null then
      select count(*) into v_count from community_session_rsvps
        where session_id = p_session and user_id <> v_uid;
      if v_count >= v_s.capacity then raise exception 'session_full'; end if;
    end if;
    insert into community_session_rsvps (session_id, user_id) values (p_session, v_uid)
      on conflict do nothing;
  else
    delete from community_session_rsvps where session_id = p_session and user_id = v_uid;
  end if;
  return query select
    exists (select 1 from community_session_rsvps where session_id = p_session and user_id = v_uid),
    (select count(*) from community_session_rsvps where session_id = p_session);
end;
$$;
revoke all on function public.community_session_rsvp(uuid, boolean) from public;
grant execute on function public.community_session_rsvp(uuid, boolean) to authenticated;

-- 5. Top contributors: a transparent activity score over a window.
--    3 per post (at most 5 a day), 1 per reply (at most 10 a day), and 1 per
--    distinct other member who liked or replied to the contributor's posts.
--    Self-engagement never counts; hidden posts never count; members who opt
--    out of leaderboards are excluded.
create or replace function public.community_top_contributors(p_days integer default 30, p_limit integer default 5)
returns table(
  user_id uuid, username text, display_name text, avatar_url text,
  score bigint, posts bigint, replies bigint, engaged_members bigint
)
language sql stable security definer
set search_path to 'public'
as $$
  with win as (select now() - make_interval(days => least(greatest(p_days, 1), 365)) as since),
  posts_day as (
    select p.user_id, date_trunc('day', p.created_at) d,
      count(*) filter (where p.parent_post_id is null) as n_posts,
      count(*) filter (where p.parent_post_id is not null) as n_replies
    from community_posts p, win
    where p.created_at >= win.since and p.moderation_hidden_at is null
    group by 1, 2
  ),
  activity as (
    select user_id, sum(least(n_posts, 5)) posts, sum(least(n_replies, 10)) replies
    from posts_day group by 1
  ),
  engaged as (
    select a.author, count(distinct a.other) n from (
      select p.user_id author, l.user_id other
        from post_likes l join community_posts p on p.id = l.post_id, win
        where l.created_at >= win.since and l.user_id <> p.user_id and p.moderation_hidden_at is null
      union
      select p.user_id, c.user_id
        from community_posts c join community_posts p on p.id = c.parent_post_id, win
        where c.created_at >= win.since and c.user_id <> p.user_id
          and c.moderation_hidden_at is null and p.moderation_hidden_at is null
    ) a group by 1
  )
  select pp.id, pp.username,
    coalesce(nullif(pp.display_name, ''), nullif(pp.full_name, ''), pp.username, 'Member'),
    pp.avatar_url,
    (3 * coalesce(a.posts, 0) + coalesce(a.replies, 0) + coalesce(e.n, 0))::bigint,
    coalesce(a.posts, 0)::bigint, coalesce(a.replies, 0)::bigint, coalesce(e.n, 0)::bigint
  from activity a
  full join engaged e on e.author = a.user_id
  join public_profiles pp on pp.id = coalesce(a.user_id, e.author)
  join profiles pr on pr.id = pp.id
  where coalesce(pr.privacy_show_on_leaderboard, true)
    and pr.deleted_at is null
    and coalesce(pr.is_disabled, false) = false
    and coalesce(pr.is_demo, false) = false
    and (3 * coalesce(a.posts, 0) + coalesce(a.replies, 0) + coalesce(e.n, 0)) > 0
  order by 5 desc, 6 desc
  limit least(greatest(p_limit, 1), 50);
$$;
grant execute on function public.community_top_contributors(integer, integer) to authenticated;
