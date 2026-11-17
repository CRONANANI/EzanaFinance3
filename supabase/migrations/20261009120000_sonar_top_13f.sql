-- sonar_top_13f: the largest reported 13F holders of a ticker for the latest widely filed
-- quarter, with a share-based change against the prior quarter.
--
-- This file restores the definition to the repository. The function already exists in the
-- database (verified Nov 17, 2026); this text is what `pg_get_functiondef` returned there,
-- so running it changes nothing. It is idempotent and additive: CREATE OR REPLACE only, no
-- table is touched.
--
-- Notes for readers of the output:
--   * It sums every indexed filing for a manager and quarter. It does not apply the
--     amendment rules that titans_13f_filing_set() applies; sonar_13f_positioning() (the
--     materialised titans_13f_* tables) does, and is what Sonar's institutional answer uses.
--   * change_type is null when no earlier quarter has at least 40% of the best quarter's
--     holder count. Values: 'new', 'added', 'trimmed', 'held' (a 1% band in shares).
--   * p_limit is clamped to 1..10.

create or replace function public.sonar_top_13f(p_ticker text, p_limit integer default 3)
 returns jsonb
 language sql
 stable
 set search_path to 'public'
as $function$
  with rows as (
    select f.cik, max(f.filer_name) as filer_name, f.period_of_report as p,
           sum(h.value_usd) as v, sum(h.shares) as s
    from public.sec_13f_holdings h
    join public.sec_filings f on f.accession_no = h.accession_no
    where h.ticker = upper(p_ticker)
      and h.put_call is null
      and f.period_of_report is not null
    group by f.cik, f.period_of_report
  ),
  cov as (
    select p, count(*) as holders from rows group by p
  ),
  best as (select max(holders) as m from cov),
  latest as (
    select max(c.p) as p from cov c, best b where c.holders >= b.m * 0.4
  ),
  prior as (
    select max(c.p) as p
    from cov c, best b, latest l
    where c.p < l.p and c.holders >= b.m * 0.4
  ),
  cur as (select r.* from rows r, latest l where r.p = l.p),
  prev as (select r.cik, r.s from rows r, prior pr where r.p = pr.p)
  select case when (select p from latest) is null then null else jsonb_build_object(
    'period', (select p from latest),
    'priorPeriod', (select p from prior),
    'holders', (select count(*) from cur),
    'totalValue', (select sum(v) from cur),
    'top', coalesce((
      select jsonb_agg(x order by x.value_usd desc)
      from (
        select c.filer_name,
               c.v as value_usd,
               c.s as shares,
               case
                 when (select p from prior) is null then null
                 when pv.cik is null then 'new'
                 when c.s > pv.s * 1.01 then 'added'
                 when c.s < pv.s * 0.99 then 'trimmed'
                 else 'held'
               end as change_type
        from cur c
        left join prev pv on pv.cik = c.cik
        order by c.v desc
        limit greatest(1, least(p_limit, 10))
      ) x
    ), '[]'::jsonb)
  ) end;
$function$;
