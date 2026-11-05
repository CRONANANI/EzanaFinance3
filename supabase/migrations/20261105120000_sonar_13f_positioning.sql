-- Deep research (Nov 2026): 13F positioning for one ticker.
--
-- The investment risk assessment needs more than the top five holders:
-- how concentrated the reported ownership is, and how managers changed their
-- positions quarter over quarter. Two data facts shape the query:
--   1. Ezana's 13F tables fill a quarter over about six weeks after it ends,
--      so the newest quarter can hold a few dozen filers while the one
--      before holds over a thousand. The "latest" quarter is the newest one
--      with at least half as many filers as the fullest quarter.
--   2. Some filings carry a share count that cannot be right (a value per
--      share far from the market price). Rows whose implied price is outside
--      0.4x to 2.5x of the median for that quarter are left out.
-- Changes are counted only among managers that filed for BOTH quarters, and
-- the result says how many that is.
--
-- plpgsql, so the function can be created before the 13F tables exist (the
-- migration test applies every migration to an empty database).
create or replace function public.sonar_13f_positioning(p_ticker text)
returns jsonb
language plpgsql stable
security definer
set search_path = public
as $$
begin
  return (
with filed as (
  select period, count(*) n from public.titans_13f_filers group by 1
),
complete as (select period from filed where n >= 0.5 * (select max(n) from filed)),
latest as (select max(period) p from complete),
prevp as (select max(period) p from filed where period < (select p from latest)),
filers_both as (
  select cik from public.titans_13f_filers where period = (select p from latest)
  intersect
  select cik from public.titans_13f_filers where period = (select p from prevp)
),
raw as (
  select period, cik, sum(coalesce(sh_shares, shares))::numeric shares, sum(value_usd)::numeric value_usd
    from public.titans_13f_positions
   where ticker = upper(p_ticker) and coalesce(put_call, '') = ''
     and period in ((select p from latest), (select p from prevp))
   group by 1, 2
),
px as (
  select period, percentile_cont(0.5) within group (order by value_usd / nullif(shares, 0)) med
    from raw where shares > 0 group by 1
),
pos as (
  select r.* from raw r join px using (period)
   where r.shares > 0 and r.value_usd / r.shares between 0.4 * px.med and 2.5 * px.med
),
cur as (select * from pos where period = (select p from latest)),
names as (
  select distinct on (cik) cik, filer_name from public.titans_13f_filers order by cik, period desc
),
moves as (
  select b.cik, coalesce(c.shares, 0) shares, coalesce(p.shares, 0) prev_shares,
         case when p.cik is null and c.cik is not null then 'new'
              when c.cik is null and p.cik is not null then 'exited'
              when c.shares > p.shares then 'added'
              when c.shares < p.shares then 'reduced' else 'unchanged' end status
    from filers_both b
    left join pos c on c.cik = b.cik and c.period = (select p from latest)
    left join pos p on p.cik = b.cik and p.period = (select p from prevp)
   where c.cik is not null or p.cik is not null
),
tot as (select sum(value_usd) v, sum(shares) s, count(*) n from cur)
select jsonb_build_object(
  'ticker', upper(p_ticker),
  'period', (select p from latest),
  'previous_period', (select p from prevp),
  'filers_in_period', (select n from filed where period = (select p from latest)),
  'holders', (select n from tot),
  'shares', (select s from tot),
  'value_usd', (select v from tot),
  'top10_share', (select case when tot.v > 0 then (select sum(value_usd) from (select value_usd from cur order by value_usd desc limit 10) t) / tot.v end from tot),
  'top', (select coalesce(jsonb_agg(x order by x.value_usd desc), '[]'::jsonb) from (
            select coalesce(n.filer_name, c.cik::text) filer, c.shares, c.value_usd,
                   case when tot.v > 0 then c.value_usd / tot.v end share_of_reported
              from cur c left join names n on n.cik = c.cik, tot
             order by c.value_usd desc limit 10) x),
  'compared_filers', (select count(*) from filers_both),
  'new_positions', (select count(*) from moves where status = 'new'),
  'exits', (select count(*) from moves where status = 'exited'),
  'added', (select count(*) from moves where status = 'added'),
  'reduced', (select count(*) from moves where status = 'reduced'),
  'adds', (select coalesce(jsonb_agg(x order by x.change_shares desc), '[]'::jsonb) from (
            select coalesce(n.filer_name, m.cik::text) filer, m.shares, m.shares - m.prev_shares change_shares, m.status
              from moves m left join names n on n.cik = m.cik
             where m.shares > m.prev_shares order by m.shares - m.prev_shares desc limit 5) x),
  'cuts', (select coalesce(jsonb_agg(x order by x.change_shares), '[]'::jsonb) from (
            select coalesce(n.filer_name, m.cik::text) filer, m.shares, m.shares - m.prev_shares change_shares, m.status
              from moves m left join names n on n.cik = m.cik
             where m.shares < m.prev_shares order by m.shares - m.prev_shares limit 5) x)
)
);
end;
$$;

revoke all on function public.sonar_13f_positioning(text) from public, anon, authenticated;
grant execute on function public.sonar_13f_positioning(text) to service_role;
