-- 13F: one definition of a filer's current filing (Nov 24 2026)
--
-- Why: Sonar and the Research Composer read "a filer's latest 13F" from titans_13f_filers,
-- the market-wide snapshot. That snapshot deliberately does not move to a quarter until the
-- quarter is complete across filers (20261124100000_sec_13f_backfill.sql), so BlackRock's
-- filed Q3 2026 13F (filed 2026-11-13) read as Q2. Hand-written EzanaQL over
-- titans.holdings_13f had no way to ask for the current filing at all, so a query without a
-- period filter mixed quarters and restated amendments.
--
-- Two meanings, kept apart:
--   a filer's own latest filing   per-filer questions: what BlackRock holds, overlaps with
--                                 a filer, a filer's top N. The newest period the filer has
--                                 filed with parsed holdings, amendments applied.
--   the latest complete quarter   market-wide questions (who holds a stock, flows,
--                                 rankings). Unchanged: titans_* and its completeness gate.
--
-- What this adds (additive):
--   sec_13f_effective_filings     each filer's effective filing set per period: the newest
--                                 full filing (an untyped or RESTATEMENT amendment replaces
--                                 the original, as in titans_13f_filing_set) plus later
--                                 NEW HOLDINGS amendments; is_latest marks the filer's
--                                 newest period. Refreshed every 15 minutes.
--   sec_13f_refresh_effective_filings()   the refresh (service role)
--   sec_13f_latest_filers(text, int)      filers by name with their latest filed period
--   ezq_13f_holdings gains is_current and is_latest (EzanaQL fields current and latest)

create table if not exists public.sec_13f_effective_filings (
  accession_no text primary key,
  cik text not null,
  filer_name text,
  form_type text,
  period date not null,
  filed_at timestamptz,
  is_addon boolean not null default false,
  is_latest boolean not null default false,
  positions integer,
  book numeric,
  refreshed_at timestamptz not null default now()
);
create index if not exists sec_13f_effective_filings_cik_period_idx
  on public.sec_13f_effective_filings (cik, period desc);
create index if not exists sec_13f_effective_filings_latest_idx
  on public.sec_13f_effective_filings (cik) where is_latest;

alter table public.sec_13f_effective_filings enable row level security;
revoke all on public.sec_13f_effective_filings from anon, authenticated;
grant all on public.sec_13f_effective_filings to service_role;

create or replace function public.sec_13f_refresh_effective_filings()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  n integer;
begin
  drop table if exists _sec_13f_eff;
  create temp table _sec_13f_eff on commit drop as
  with f as (
    select s.accession_no, s.cik, s.filer_name, s.form_type,
           s.period_of_report as period, s.filed_at,
           s.table_entry_total, s.table_value_total,
           (s.form_type ilike '%/A'
             and upper(coalesce(s.amendment_type, '')) = 'NEW HOLDINGS') as is_addon
      from public.sec_filings s
     where s.form_family = 'institutional'
       and s.period_of_report is not null
       and s.cik is not null
       and exists (select 1 from public.sec_13f_holdings h where h.accession_no = s.accession_no)
  ),
  base as (
    select distinct on (f.cik, f.period) f.*
      from f
     where not f.is_addon
     order by f.cik, f.period, f.filed_at desc, f.accession_no desc
  ),
  eff as (
    select b.accession_no, b.cik, b.filer_name, b.form_type, b.period, b.filed_at,
           false as is_addon, b.table_entry_total, b.table_value_total
      from base b
    union all
    select a.accession_no, a.cik, b.filer_name, a.form_type, a.period, a.filed_at,
           true, a.table_entry_total, a.table_value_total
      from f a
      join base b on b.cik = a.cik and b.period = a.period
     where a.is_addon
       and a.filed_at >= b.filed_at
       and a.accession_no <> b.accession_no
  )
  select e.*, e.period = max(e.period) over (partition by e.cik) as is_latest
    from eff e;

  delete from public.sec_13f_effective_filings;
  insert into public.sec_13f_effective_filings
    (accession_no, cik, filer_name, form_type, period, filed_at, is_addon, is_latest,
     positions, book, refreshed_at)
  select accession_no, cik, filer_name, form_type, period, filed_at, is_addon, is_latest,
         table_entry_total, table_value_total, now()
    from _sec_13f_eff;
  get diagnostics n = row_count;
  return n;
end;
$function$;

revoke all on function public.sec_13f_refresh_effective_filings() from public, anon, authenticated;
grant execute on function public.sec_13f_refresh_effective_filings() to service_role;

create or replace function public.sec_13f_latest_filers(p_text text, p_limit integer default 10)
returns table (cik text, filer_name text, period date, filed_at timestamptz, positions integer, book numeric)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select e.cik,
         max(e.filer_name) filter (where not e.is_addon) as filer_name,
         e.period,
         max(e.filed_at) as filed_at,
         sum(e.positions)::integer as positions,
         sum(e.book) as book
    from public.sec_13f_effective_filings e
   where e.is_latest
     and length(trim(coalesce(p_text, ''))) >= 2
     and e.filer_name ilike '%' || replace(replace(trim(p_text), '%', ''), '_', '') || '%'
   group by e.cik, e.period
   order by sum(e.book) desc nulls last
   limit greatest(1, least(coalesce(p_limit, 10), 50));
$function$;

revoke all on function public.sec_13f_latest_filers(text, integer) from public, anon, authenticated;
grant execute on function public.sec_13f_latest_filers(text, integer) to service_role;

-- New columns go at the end, so existing queries over the view are unchanged.
create or replace view public.ezq_13f_holdings
with (security_invoker = true) as
select
  h.accession_no,
  f.cik                 as filer_cik,
  f.filer_name,
  f.form_type,
  f.period_of_report,
  f.filed_at,
  h.name_of_issuer      as issuer,
  h.cusip,
  upper(h.ticker)       as ticker,
  h.value_usd,
  h.shares,
  h.share_type,
  h.put_call,
  (e.accession_no is not null)    as is_current,
  coalesce(e.is_latest, false)    as is_latest
from public.sec_13f_holdings h
join public.sec_filings f on f.accession_no = h.accession_no
left join public.sec_13f_effective_filings e on e.accession_no = h.accession_no;

revoke all on public.ezq_13f_holdings from anon, authenticated;
grant select on public.ezq_13f_holdings to service_role;

select public.sec_13f_refresh_effective_filings();

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'sec-13f-effective-filings';
    perform cron.schedule(
      'sec-13f-effective-filings',
      '*/15 * * * *',
      'select public.sec_13f_refresh_effective_filings()'
    );
  end if;
end $$;

-- Sonar's "top holders of a stock" (market-wide) reads the effective filings too, so a
-- restated amendment and its original are no longer both summed. Same output and period
-- rule as before (the newest period covering at least 40% of the best-covered one).
create or replace function public.sonar_top_13f(p_ticker text, p_limit integer default 3)
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  with rows as (
    select e.cik, max(e.filer_name) as filer_name, e.period as p,
           sum(h.value_usd) as v, sum(h.shares) as s
    from public.sec_13f_holdings h
    join public.sec_13f_effective_filings e on e.accession_no = h.accession_no
    where h.ticker = upper(p_ticker)
      and h.put_call is null
    group by e.cik, e.period
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
