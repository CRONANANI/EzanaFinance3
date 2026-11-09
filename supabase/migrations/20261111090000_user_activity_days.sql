-- Activity density for the home Morning Brief card (Nov 2026).
--
-- public.user_activity_days(p_user, p_since) returns one row per UTC day on
-- or after p_since on which the user logged in or did something:
--   day        date     the UTC calendar day
--   actions    integer  recorded actions that day (see the sources below)
--   logged_in  boolean  a user_login_history row exists for that day
--
-- Actions are counted from durable per-user tables only, each row once:
--   sonar_queries (pings), community_posts, post_likes, post_saves,
--   mock_trades (paper trades), user_trades (logged trades),
--   user_watchlist_items (watchlist adds), elo_transactions where
--   category = 'learning' (completed lessons).
-- activity_breadcrumbs is deliberately NOT a source: it is pruned after 30
-- days and duplicates likes and watchlist adds.
--
-- Robust to a partial schema: a source table (or its user_id / timestamp
-- column) that does not exist is skipped, so the function never errors on a
-- database where one of those migrations has not been applied.
--
-- Called only by the server route /api/activity-density with the service
-- role and the signed-in user's id; not callable by anon or authenticated.

create or replace function public.user_activity_days(p_user uuid, p_since date)
returns table (day date, actions integer, logged_in boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  src record;
  parts text[] := '{}';
  acts_sql text;
  logins_sql text;
begin
  for src in
    select *
    from (values
      ('sonar_queries',        'created_at', null::text),
      ('community_posts',      'created_at', null::text),
      ('post_likes',           'created_at', null::text),
      ('post_saves',           'created_at', null::text),
      ('mock_trades',          'created_at', null::text),
      ('user_trades',          'created_at', null::text),
      ('user_watchlist_items', 'created_at', null::text),
      ('elo_transactions',     'created_at', 'category = ''learning''')
    ) as v(tbl, col, cond)
  loop
    if to_regclass('public.' || src.tbl) is not null
       and exists (select 1 from information_schema.columns c
                   where c.table_schema = 'public' and c.table_name = src.tbl and c.column_name = 'user_id')
       and exists (select 1 from information_schema.columns c
                   where c.table_schema = 'public' and c.table_name = src.tbl and c.column_name = src.col)
    then
      parts := parts || format(
        'select (%1$I at time zone ''UTC'')::date as d, count(*)::int as n
           from public.%2$I
          where user_id = $1
            and %1$I >= ($2::timestamp at time zone ''UTC'')%3$s
          group by 1',
        src.col, src.tbl,
        case when src.cond is null then '' else ' and ' || src.cond end
      );
    end if;
  end loop;

  acts_sql := coalesce(
    nullif(array_to_string(parts, ' union all '), ''),
    'select null::date as d, 0 as n where false'
  );

  if to_regclass('public.user_login_history') is not null then
    logins_sql := 'select distinct login_date as d from public.user_login_history
                    where user_id = $1 and login_date >= $2';
  else
    logins_sql := 'select null::date as d where false';
  end if;

  return query execute format(
    'with a as (%s),
          acts as (select d, sum(n)::int as n from a group by d),
          logins as (%s)
     select coalesce(acts.d, logins.d) as day,
            coalesce(acts.n, 0)        as actions,
            (logins.d is not null)     as logged_in
       from acts
       full join logins on logins.d = acts.d
      order by 1',
    acts_sql, logins_sql
  ) using p_user, p_since;
end;
$$;

revoke all on function public.user_activity_days(uuid, date) from public;
revoke all on function public.user_activity_days(uuid, date) from anon, authenticated;
grant execute on function public.user_activity_days(uuid, date) to service_role;

comment on function public.user_activity_days(uuid, date) is
  'Home activity density: per UTC day, recorded actions and whether the user logged in. Service role only (/api/activity-density).';
