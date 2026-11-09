-- Activity percentiles for the home activity card and the profile Activity
-- section (Nov 2026).
--
-- public.user_activity_stats         one row per eligible member: active days,
--                                    busiest day (actions), longest streak and
--                                    current streak over the same window the
--                                    card shows (371 UTC days). Refreshed daily.
-- public.refresh_user_activity_stats rebuilds that table. Called by the cron
--                                    route /api/cron/activity-percentiles.
-- public.activity_stat_percentiles   where a set of live values falls in that
--                                    distribution (0 to 100, ties split).
-- public.user_activity_breakdown     one user's actions by source, for the
--                                    profile "What you do" panel.
--
-- Sources and the "active day" rule match public.user_activity_days
-- (migration 20261111090000): a day is active if the member logged in or took
-- at least one recorded action. Missing source tables are skipped.
--
-- Additive and idempotent. Service role only: RLS on with no policies, and
-- EXECUTE revoked from anon and authenticated.

create table if not exists public.user_activity_stats (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  active_days         integer not null default 0,
  busiest_day_actions integer not null default 0,
  longest_streak      integer not null default 0,
  current_streak      integer not null default 0,
  window_days         integer not null default 371,
  computed_at         timestamptz not null default now()
);

alter table public.user_activity_stats enable row level security;

create index if not exists idx_user_activity_stats_active  on public.user_activity_stats (active_days);
create index if not exists idx_user_activity_stats_busiest on public.user_activity_stats (busiest_day_actions);
create index if not exists idx_user_activity_stats_longest on public.user_activity_stats (longest_streak);
create index if not exists idx_user_activity_stats_current on public.user_activity_stats (current_streak);

-- ---------------------------------------------------------------------------
-- Shared: the list of action sources (kept identical to user_activity_days).
-- ---------------------------------------------------------------------------
create or replace function public.activity_source_list()
returns table (tbl text, col text, cond text)
language sql
immutable
set search_path = public
as $$
  values
    ('sonar_queries',        'created_at', null::text),
    ('community_posts',      'created_at', null::text),
    ('post_likes',           'created_at', null::text),
    ('post_saves',           'created_at', null::text),
    ('mock_trades',          'created_at', null::text),
    ('user_trades',          'created_at', null::text),
    ('user_watchlist_items', 'created_at', null::text),
    ('elo_transactions',     'created_at', 'category = ''learning''')
$$;

-- ---------------------------------------------------------------------------
-- Daily refresh of the distribution.
-- ---------------------------------------------------------------------------
create or replace function public.refresh_user_activity_stats(p_days integer default 371)
returns integer
language plpgsql
volatile
security definer
set search_path = public
set statement_timeout = '240s'
as $$
declare
  src        record;
  parts      text[] := '{}';
  acts_sql   text;
  logins_sql text;
  v_days     integer := least(greatest(coalesce(p_days, 371), 7), 400);
  v_today    date    := (now() at time zone 'UTC')::date;
  v_since    date;
  v_count    integer;
begin
  v_since := v_today - (v_days - 1);

  for src in select * from public.activity_source_list() loop
    if to_regclass('public.' || src.tbl) is not null
       and exists (select 1 from information_schema.columns c
                   where c.table_schema = 'public' and c.table_name = src.tbl and c.column_name = 'user_id')
       and exists (select 1 from information_schema.columns c
                   where c.table_schema = 'public' and c.table_name = src.tbl and c.column_name = src.col)
    then
      parts := parts || format(
        'select user_id as u, (%1$I at time zone ''UTC'')::date as d, count(*)::int as n
           from public.%2$I
          where user_id is not null
            and %1$I >= ($1::timestamp at time zone ''UTC'')%3$s
          group by 1, 2',
        src.col, src.tbl,
        case when src.cond is null then '' else ' and ' || src.cond end
      );
    end if;
  end loop;

  acts_sql := coalesce(
    nullif(array_to_string(parts, ' union all '), ''),
    'select null::uuid as u, null::date as d, 0 as n where false'
  );

  if to_regclass('public.user_login_history') is not null then
    logins_sql := 'select distinct user_id as u, login_date as d
                     from public.user_login_history
                    where login_date >= $1';
  else
    logins_sql := 'select null::uuid as u, null::date as d where false';
  end if;

  execute format(
    $q$
    with a as (%s),
         acts as (select u, d, sum(n)::int as n from a group by u, d),
         logins as (%s),
         days as (
           select coalesce(acts.u, logins.u) as u,
                  coalesce(acts.d, logins.d) as d,
                  coalesce(acts.n, 0)        as n
             from acts
             full join logins on logins.u = acts.u and logins.d = acts.d
         ),
         isl as (
           select u, d, d - (row_number() over (partition by u order by d))::int as grp
             from days
         ),
         runs as (
           select u, count(*)::int as len, max(d) as last_d
             from isl group by u, grp
         ),
         per as (
           select u, count(*)::int as active_days, max(n)::int as busiest
             from days group by u
         ),
         streaks as (
           select u,
                  max(len) as longest,
                  coalesce(max(len) filter (where last_d >= $2 - 1), 0) as cur
             from runs group by u
         ),
         members as (
           select id from public.profiles
            where deleted_at is null
              and coalesce(is_disabled, false) = false
              and coalesce(is_demo, false) = false
         )
    insert into public.user_activity_stats
      (user_id, active_days, busiest_day_actions, longest_streak, current_streak, window_days, computed_at)
    select m.id,
           coalesce(per.active_days, 0),
           coalesce(per.busiest, 0),
           coalesce(s.longest, 0),
           coalesce(s.cur, 0),
           $3,
           now()
      from members m
      left join per     on per.u = m.id
      left join streaks s on s.u = m.id
    on conflict (user_id) do update set
      active_days         = excluded.active_days,
      busiest_day_actions = excluded.busiest_day_actions,
      longest_streak      = excluded.longest_streak,
      current_streak      = excluded.current_streak,
      window_days         = excluded.window_days,
      computed_at         = excluded.computed_at
    $q$,
    acts_sql, logins_sql
  ) using v_since, v_today, v_days;

  get diagnostics v_count = row_count;

  -- Members who were deleted, disabled or marked demo since the last run.
  delete from public.user_activity_stats s
   where not exists (
     select 1 from public.profiles p
      where p.id = s.user_id
        and p.deleted_at is null
        and coalesce(p.is_disabled, false) = false
        and coalesce(p.is_demo, false) = false
   );

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Percentile of live values against the latest distribution.
-- pct = 100 * (members below + half of members tied) / members.
-- ---------------------------------------------------------------------------
create or replace function public.activity_stat_percentiles(
  p_active_days integer,
  p_busiest     integer,
  p_longest     integer,
  p_current     integer
)
returns table (
  population      bigint,
  active_days_pct numeric,
  busiest_pct     numeric,
  longest_pct     numeric,
  current_pct     numeric,
  computed_at     timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*),
    round(100.0 * (count(*) filter (where s.active_days < p_active_days)
                   + 0.5 * count(*) filter (where s.active_days = p_active_days))
          / nullif(count(*), 0), 1),
    round(100.0 * (count(*) filter (where s.busiest_day_actions < p_busiest)
                   + 0.5 * count(*) filter (where s.busiest_day_actions = p_busiest))
          / nullif(count(*), 0), 1),
    round(100.0 * (count(*) filter (where s.longest_streak < p_longest)
                   + 0.5 * count(*) filter (where s.longest_streak = p_longest))
          / nullif(count(*), 0), 1),
    round(100.0 * (count(*) filter (where s.current_streak < p_current)
                   + 0.5 * count(*) filter (where s.current_streak = p_current))
          / nullif(count(*), 0), 1),
    max(s.computed_at)
  from public.user_activity_stats s;
$$;

-- ---------------------------------------------------------------------------
-- One member's actions by source (profile "What you do").
-- ---------------------------------------------------------------------------
create or replace function public.user_activity_breakdown(p_user uuid, p_since date)
returns table (source text, actions integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  src   record;
  parts text[] := '{}';
begin
  for src in select * from public.activity_source_list() loop
    if to_regclass('public.' || src.tbl) is not null
       and exists (select 1 from information_schema.columns c
                   where c.table_schema = 'public' and c.table_name = src.tbl and c.column_name = 'user_id')
       and exists (select 1 from information_schema.columns c
                   where c.table_schema = 'public' and c.table_name = src.tbl and c.column_name = src.col)
    then
      parts := parts || format(
        'select %4$L::text as source, count(*)::int as actions
           from public.%2$I
          where user_id = $1
            and %1$I >= ($2::timestamp at time zone ''UTC'')%3$s',
        src.col, src.tbl,
        case when src.cond is null then '' else ' and ' || src.cond end,
        src.tbl
      );
    end if;
  end loop;

  if array_length(parts, 1) is null then
    return;
  end if;

  return query execute
    'select source, actions from (' || array_to_string(parts, ' union all ') || ') x
      where actions > 0 order by actions desc'
    using p_user, p_since;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: service role only.
-- ---------------------------------------------------------------------------
revoke all on function public.activity_source_list()                                   from public, anon, authenticated;
revoke all on function public.refresh_user_activity_stats(integer)                      from public, anon, authenticated;
revoke all on function public.activity_stat_percentiles(integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.user_activity_breakdown(uuid, date)                       from public, anon, authenticated;

grant execute on function public.activity_source_list()                                   to service_role;
grant execute on function public.refresh_user_activity_stats(integer)                      to service_role;
grant execute on function public.activity_stat_percentiles(integer, integer, integer, integer) to service_role;
grant execute on function public.user_activity_breakdown(uuid, date)                       to service_role;

comment on table public.user_activity_stats is
  'Daily snapshot of per-member activity stats (371-day window) for platform percentiles. Service role only.';

-- First fill, so percentiles show as soon as the migration lands.
select public.refresh_user_activity_stats(371);
