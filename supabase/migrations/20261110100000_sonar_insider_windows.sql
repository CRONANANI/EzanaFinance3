-- Sonar insider buying for any time window (Nov 10, 2026).
--
-- Two read-only functions for src/lib/sonar/landing-insider-buying.js:
--
--   sonar_insider_coverage(p_min_rows)
--     Where Ezana's insider purchase records reliably start: the first month with at least
--     p_min_rows open-market purchase lines whose first line falls in the month's first
--     week (so a month the parser joined part-way through does not count as covered).
--     -> { "coveredFrom": "2026-10-01", "latest": "2026-11-06" }
--
--   sonar_insider_buys_window(p_from, p_to, p_top)
--     A long window (a year, a quarter, "since 2025") grouped in the database instead of
--     paged into the ping. The grouping mirrors groupTransactions in
--     src/lib/sec/insider-buys.js: open-market purchase lines (code P, acquired, non
--     derivative, shares and value above zero, a listed ticker) grouped by filing and
--     reporter, then a 4/A restating the same buy (issuer, reporter, last date, shares)
--     replaces the original. Roles follow roleOf in the same file.
--     -> { count, total, companies, insiders, median, tiers, tierValue, roles, smallest,
--          firstDate, lastDate, latestFiled, groups: [the p_top largest buys] }
--
-- Applied by hand in the Supabase SQL Editor. Service role only.

-- Bodies reference sec_insider_transactions, which a scratch test database may not have.
set check_function_bodies = off;

create or replace function public.sonar_insider_coverage(p_min_rows integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with months as (
    select date_trunc('month', transaction_date)::date as m,
           count(*) as n,
           min(transaction_date) as first_day
    from public.sec_insider_transactions
    where transaction_code = 'P'
      and table_kind = 'non_derivative'
      and transaction_date is not null
    group by 1
  )
  select jsonb_build_object(
    'coveredFrom', (
      select min(m) from months
      where n >= greatest(coalesce(p_min_rows, 50), 1)
        and first_day <= m + 6
    ),
    'latest', (
      select max(transaction_date) from public.sec_insider_transactions
      where transaction_code = 'P' and table_kind = 'non_derivative'
    )
  );
$$;

create or replace function public.sonar_insider_buys_window(
  p_from date,
  p_to date,
  p_top integer default 200
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with lines as (
    select t.*,
           upper(btrim(coalesce(t.issuer_ticker, ''))) as tk,
           coalesce(
             t.value_usd,
             case when t.shares is not null and t.price is not null then t.shares * t.price end
           ) as v
    from public.sec_insider_transactions t
    where t.transaction_code = 'P'
      and (t.acquired_disposed is null or t.acquired_disposed = 'A')
      and t.table_kind = 'non_derivative'
      and t.transaction_date between p_from and p_to
  ),
  valid as (
    select * from lines
    where shares > 0
      and v > 0
      and tk ~ '^[A-Z]{1,5}([.-][A-Z]{1,2})?$'
      and tk not in ('NONE', 'NA')
      and tk !~ '^[A-Z]{4}X$'
  ),
  by_filing as (
    select accession_no,
           coalesce(nullif(reporter_cik, ''), reporter_name, '') as rkey,
           (array_agg(form_type order by transaction_date, line_no))[1] as form_type,
           max(filed_at) as filed_at,
           (array_agg(tk order by transaction_date, line_no))[1] as ticker,
           (array_agg(issuer_cik order by transaction_date, line_no))[1] as issuer_cik,
           (array_agg(issuer_name order by transaction_date, line_no))[1] as issuer_name,
           (array_agg(reporter_cik order by transaction_date, line_no))[1] as reporter_cik,
           (array_agg(reporter_name order by transaction_date, line_no))[1] as reporter_name,
           (array_agg(reporter_title order by transaction_date, line_no))[1] as reporter_title,
           bool_or(is_director) as is_director,
           bool_or(is_officer) as is_officer,
           bool_or(is_ten_pct_owner) as is_ten_pct_owner,
           bool_or(direct_indirect = 'I') as indirect,
           sum(shares) as shares,
           sum(v) as value,
           count(*) as lines,
           min(transaction_date) as first_date,
           max(transaction_date) as last_date
    from valid
    group by 1, 2
  ),
  deduped as (
    select distinct on (
      ticker,
      lower(coalesce(nullif(reporter_cik, ''), reporter_name, '')),
      last_date,
      round(shares)
    ) *
    from by_filing
    order by ticker,
             lower(coalesce(nullif(reporter_cik, ''), reporter_name, '')),
             last_date,
             round(shares),
             filed_at desc nulls last
  ),
  flagged as (
    select d.*,
           lower(coalesce(d.reporter_title, '')) as lt
    from deduped d
  ),
  roled as (
    select f.*,
           case
             when ceo and pres then 'President & CEO'
             when ceo and chair then 'Chair & CEO'
             when ceo then 'CEO'
             when pres then 'President'
             when cfo then 'CFO'
             when coo then 'COO'
             when chair then 'Chair'
             when f.is_officer then 'Officer'
             when f.is_director then 'Director'
             when f.is_ten_pct_owner then '10% Owner'
             else 'Insider'
           end as role_label,
           case
             when ceo or pres or cfo or coo or chair then 'exec'
             when f.is_officer then 'officer'
             when f.is_director then 'director'
             when f.is_ten_pct_owner then 'owner'
             else 'other'
           end as tier
    from flagged f
    cross join lateral (
      select
        (f.lt ~ '\mceo\M' or f.lt like '%chief executive%') as ceo,
        (f.lt ~ '\mpresident\M'
          and f.lt !~ 'vice[[:space:]-]+president|\mvp\M|\mevp\M|\msvp\M') as pres,
        (f.lt ~ '\mcfo\M' or f.lt like '%chief financial%') as cfo,
        (f.lt ~ '\mcoo\M' or f.lt like '%chief operating%') as coo,
        (f.lt ~ '\mchair' and f.lt !~ 'vice[[:space:]-]+chair') as chair
    ) r
  ),
  tier_keys as (
    select unnest(array['exec', 'director', 'officer', 'owner', 'other']) as tier
  ),
  tiers as (
    select k.tier, count(r.*) as n, coalesce(sum(r.value), 0) as v
    from tier_keys k
    left join roled r on r.tier = k.tier
    group by k.tier
  ),
  roles as (
    select role_label, count(*) as n from roled group by role_label
  ),
  smallest as (
    select * from roled order by value asc, last_date asc limit 1
  ),
  top_groups as (
    select * from roled
    order by value desc, last_date desc
    limit greatest(least(coalesce(p_top, 200), 1000), 1)
  )
  select jsonb_build_object(
    'count', (select count(*) from roled),
    'total', (select coalesce(sum(value), 0) from roled),
    'companies', (select count(distinct ticker) from roled),
    'insiders', (select count(distinct coalesce(nullif(reporter_cik, ''), lower(reporter_name))) from roled),
    'median', (select percentile_cont(0.5) within group (order by value) from roled),
    'tiers', (select jsonb_object_agg(tier, n) from tiers),
    'tierValue', (select jsonb_object_agg(tier, v) from tiers),
    'roles', coalesce((select jsonb_object_agg(role_label, n) from roles), '{}'::jsonb),
    'smallest', (
      select jsonb_build_object(
        'ticker', ticker,
        'name', issuer_name,
        'reporter', reporter_name,
        'role', role_label,
        'value', value,
        'date', last_date
      )
      from smallest
    ),
    'firstDate', (select min(last_date) from roled),
    'lastDate', (select max(last_date) from roled),
    'latestFiled', (select max(filed_at) from roled),
    'groups', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'accession_no', accession_no,
          'form_type', form_type,
          'filed_at', filed_at,
          'ticker', ticker,
          'issuer_cik', issuer_cik,
          'issuer_name', issuer_name,
          'reporter_cik', reporter_cik,
          'reporter_name', reporter_name,
          'reporter_title', reporter_title,
          'is_director', is_director,
          'is_officer', is_officer,
          'is_ten_pct_owner', is_ten_pct_owner,
          'indirect', indirect,
          'shares', shares,
          'value', value,
          'lines', lines,
          'first_date', first_date,
          'last_date', last_date
        )
        order by value desc, last_date desc
      )
      from top_groups
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.sonar_insider_coverage(integer) from public, anon, authenticated;
grant execute on function public.sonar_insider_coverage(integer) to service_role;

revoke all on function public.sonar_insider_buys_window(date, date, integer) from public, anon, authenticated;
grant execute on function public.sonar_insider_buys_window(date, date, integer) to service_role;

-- Long windows filter on code, kind and date; this index serves both functions.
do $idx$
begin
  if to_regclass('public.sec_insider_transactions') is not null then
    create index if not exists sec_insider_transactions_p_date_idx
      on public.sec_insider_transactions (transaction_date)
      where transaction_code = 'P' and table_kind = 'non_derivative';
  end if;
end
$idx$;
