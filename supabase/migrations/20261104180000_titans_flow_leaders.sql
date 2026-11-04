-- Titans Shadow: 13F flow leaders (Nov 4, 2026), for Sonar's "what are hedge
-- funds selling / buying" pings and any page that wants dollar flows.
--
-- NOT executed by the implementer. Noah applies it by hand in the SQL Editor.
-- Additive and idempotent: one new function pair, one new pg_cron job, no new
-- table (the payload lives in titans_snapshots under 'flows:<period>').
--
-- What it computes, per quarter, over the filers that filed BOTH that quarter
-- and the one before (the same population refresh_titans_institutional uses
-- for buyers/sellers), equity rows only (put_call = ''):
--   flow_usd   share change x the quarter-end implied price (an exit uses the
--              prior row's price). Same formula as t_change.flow_usd in
--              20261022120000_titans_institutional_snapshot_v2.sql.
--   class      new / exited / doubled / added / trimmed / flat, identical to
--              classifyChange() in src/lib/whale-score.js.
-- Lists (p_limit each, default 40):
--   most_sold / net_sold / most_bought / net_bought  per security, ranked by
--              dollars; a name needs two or more filers moving it the same way
--              so one filer's rebalance never tops the list.
--   breadth_sold  more sellers than buyers, ranked by the gap.
--   sellers    filers ranked by dollars sold, with their top three sales.
--   exits      the largest complete exits by prior value.
--   sectors    sold / bought / net per GICS sector (ticker_sectors).
--   coverage   filers and reported value compared vs the quarter's totals,
--              so the UI can say exactly how much of the market it saw.
--
-- Reads only the materialised quarters (titans_13f_filers/positions), so a
-- refresh is a few seconds and the Sonar ping is one primary-key lookup.

create or replace function public.refresh_titans_flows(p_period date, p_limit integer default 40)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
set statement_timeout to '120s'
as $function$
declare
  v_period date := (date_trunc('quarter', p_period) + interval '3 months' - interval '1 day')::date;
  v_prior date := (date_trunc('quarter', p_period) - interval '1 day')::date;
  v_lim integer := least(greatest(coalesce(p_limit, 40), 5), 100);
  v_payload jsonb;
begin
  if not exists (select 1 from public.titans_13f_filers where period = v_period)
     or not exists (select 1 from public.titans_13f_filers where period = v_prior) then
    return null;
  end if;

with
b as (
  select c.cik, c.filer_name, c.book as book_now, p.book as book_prior
    from public.titans_13f_filers c
    join public.titans_13f_filers p on p.cik = c.cik and p.period = v_prior
   where c.period = v_period
),
n as (
  select x.cik, x.cusip, max(x.ticker) as ticker, max(x.issuer) as issuer,
         sum(x.shares) as shares, sum(x.value_usd) as value_usd
    from public.titans_13f_positions x join b on b.cik = x.cik
   where x.period = v_period and x.put_call = '' and x.cusip is not null
   group by x.cik, x.cusip
),
o as (
  select x.cik, x.cusip, max(x.ticker) as ticker, max(x.issuer) as issuer,
         sum(x.shares) as shares, sum(x.value_usd) as value_usd
    from public.titans_13f_positions x join b on b.cik = x.cik
   where x.period = v_prior and x.put_call = '' and x.cusip is not null
   group by x.cik, x.cusip
),
ch as (
  select coalesce(n.cik, o.cik) as cik,
         coalesce(n.cusip, o.cusip) as cusip,
         coalesce(n.ticker, o.ticker) as ticker,
         coalesce(n.issuer, o.issuer) as issuer,
         coalesce(n.shares, 0) as shares_now,
         coalesce(o.shares, 0) as shares_prior,
         coalesce(n.value_usd, 0) as value_now,
         coalesce(o.value_usd, 0) as value_prior,
         case
           when coalesce(o.shares, 0) = 0 and coalesce(n.shares, 0) > 0 then 'new'
           when coalesce(n.shares, 0) = 0 and coalesce(o.shares, 0) > 0 then 'exited'
           when coalesce(o.shares, 0) > 0 and coalesce(n.shares, 0) >= coalesce(o.shares, 0) * 2 then 'doubled'
           when coalesce(n.shares, 0) > coalesce(o.shares, 0) then 'added'
           when coalesce(n.shares, 0) < coalesce(o.shares, 0) then 'trimmed'
           else 'flat'
         end as class,
         (coalesce(n.shares, 0) - coalesce(o.shares, 0)) *
           case
             when coalesce(n.shares, 0) > 0 then n.value_usd / nullif(n.shares, 0)
             when coalesce(o.shares, 0) > 0 then o.value_usd / nullif(o.shares, 0)
             else 0
           end as flow_usd
    from n full join o on o.cik = n.cik and o.cusip = n.cusip
),
sec as (
  select cusip,
         max(ticker) as ticker,
         max(issuer) as issuer,
         coalesce(-sum(flow_usd) filter (where flow_usd < 0), 0) as sold_usd,
         coalesce(sum(flow_usd) filter (where flow_usd > 0), 0) as bought_usd,
         coalesce(sum(flow_usd), 0) as net_usd,
         count(*) filter (where class in ('trimmed', 'exited')) as sellers,
         count(*) filter (where class in ('new', 'doubled', 'added')) as buyers,
         count(*) filter (where class = 'exited') as exits,
         count(*) filter (where class = 'new') as new_holders,
         count(*) filter (where shares_now > 0) as holders_now,
         count(*) filter (where shares_prior > 0) as holders_prior,
         sum(value_now) as value_now,
         sum(value_prior) as value_prior
    from ch group by cusip
),
secx as (
  select s.*, ts.sector from sec s left join public.ticker_sectors ts on ts.ticker = s.ticker
)
select jsonb_build_object(
  'period', v_period, 'prior_period', v_prior, 'computed_at', now(),
  'coverage', jsonb_build_object(
    'filers_compared', (select count(*) from b),
    'book_compared', (select coalesce(sum(book_now), 0) from b),
    'filers_total', (select count(*) from public.titans_13f_filers where period = v_period),
    'book_total', (select coalesce(sum(book), 0) from public.titans_13f_filers where period = v_period),
    'filers_prior_total', (select count(*) from public.titans_13f_filers where period = v_prior)),
  'totals', jsonb_build_object(
    'sold_usd', (select coalesce(sum(sold_usd), 0) from sec),
    'bought_usd', (select coalesce(sum(bought_usd), 0) from sec),
    'exits', (select count(*) from ch where class = 'exited'),
    'new_positions', (select count(*) from ch where class = 'new')),
  'most_sold', coalesce((select jsonb_agg(x order by x.sold_usd desc) from (
      select * from secx where sold_usd > 0 and sellers >= 2 order by sold_usd desc limit v_lim) x), '[]'::jsonb),
  'net_sold', coalesce((select jsonb_agg(x order by x.net_usd asc) from (
      select * from secx where net_usd < 0 and sellers >= 2 order by net_usd asc limit v_lim) x), '[]'::jsonb),
  'most_bought', coalesce((select jsonb_agg(x order by x.bought_usd desc) from (
      select * from secx where bought_usd > 0 and buyers >= 2 order by bought_usd desc limit v_lim) x), '[]'::jsonb),
  'net_bought', coalesce((select jsonb_agg(x order by x.net_usd desc) from (
      select * from secx where net_usd > 0 and buyers >= 2 order by net_usd desc limit v_lim) x), '[]'::jsonb),
  'breadth_sold', coalesce((select jsonb_agg(x order by (x.sellers - x.buyers) desc, x.sold_usd desc) from (
      select * from secx where sellers > buyers order by (sellers - buyers) desc, sold_usd desc limit v_lim) x), '[]'::jsonb),
  'sellers', coalesce((select jsonb_agg(x order by x.sold_usd desc) from (
      select ch.cik, max(b.filer_name) as filer_name, max(b.book_prior) as book_prior,
             -sum(ch.flow_usd) filter (where ch.flow_usd < 0) as sold_usd,
             coalesce(sum(ch.flow_usd) filter (where ch.flow_usd > 0), 0) as bought_usd,
             count(*) filter (where ch.class in ('trimmed', 'exited')) as cut,
             count(*) filter (where ch.class = 'exited') as exits,
             (array_agg(ch.ticker order by ch.flow_usd asc) filter (where ch.flow_usd < 0 and ch.ticker is not null))[1:3] as top_sold
        from ch join b on b.cik = ch.cik
       group by ch.cik
      having sum(ch.flow_usd) filter (where ch.flow_usd < 0) < 0
       order by 4 desc limit v_lim) x), '[]'::jsonb),
  'exits', coalesce((select jsonb_agg(x order by x.value_prior desc) from (
      select ch.cik, b.filer_name, ch.cusip, ch.ticker, ch.issuer, ch.value_prior, ch.shares_prior,
             ch.value_prior / nullif(b.book_prior, 0) as pct_of_prior_book
        from ch join b on b.cik = ch.cik
       where ch.class = 'exited'
       order by ch.value_prior desc nulls last limit v_lim) x), '[]'::jsonb),
  'sectors', coalesce((select jsonb_agg(x order by x.net_usd asc) from (
      select coalesce(sector, 'Unclassified') as sector,
             sum(sold_usd) as sold_usd, sum(bought_usd) as bought_usd, sum(net_usd) as net_usd,
             count(*) filter (where net_usd < 0) as names_net_sold
        from secx group by 1) x), '[]'::jsonb)
) into v_payload;

  insert into public.titans_snapshots (key, payload, computed_at)
  values ('flows:' || v_period::text, v_payload, now())
  on conflict (key) do update set payload = excluded.payload, computed_at = excluded.computed_at;

  return jsonb_build_object(
    'period', v_period,
    'filers_compared', v_payload->'coverage'->'filers_compared',
    'most_sold', jsonb_array_length(v_payload->'most_sold')
  );
end;
$function$;

revoke all on function public.refresh_titans_flows(date, integer) from public, anon, authenticated;
grant execute on function public.refresh_titans_flows(date, integer) to service_role;

-- The complete quarter and, while its window is open, the filing quarter.
create or replace function public.refresh_titans_flows_current()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_out jsonb := '{}'::jsonb;
begin
  v_out := v_out || jsonb_build_object(
    'complete', public.refresh_titans_flows(public.titans_latest_complete_quarter(), 40));
  if public.titans_open_report_quarter() is not null then
    v_out := v_out || jsonb_build_object(
      'open', public.refresh_titans_flows(public.titans_open_report_quarter(), 40));
  end if;
  return v_out;
end;
$function$;

revoke all on function public.refresh_titans_flows_current() from public, anon, authenticated;
grant execute on function public.refresh_titans_flows_current() to service_role;

-- After both materialising jobs (:25 open quarter, :55 complete quarter).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'titans-flows';
    perform cron.schedule(
      'titans-flows',
      '40 * * * *',
      'select public.refresh_titans_flows_current()'
    );
  end if;
end $$;

-- First fill, now (a few seconds each). Guarded so a schema without the
-- Titans tables (the SQL test harness) skips it; production always runs it.
do $$
begin
  if to_regprocedure('public.titans_latest_complete_quarter()') is not null
     and to_regprocedure('public.titans_open_report_quarter()') is not null
     and to_regclass('public.titans_13f_positions') is not null
     and to_regclass('public.titans_13f_filers') is not null
     and to_regclass('public.titans_snapshots') is not null then
    perform public.refresh_titans_flows_current();
  end if;
end $$;
