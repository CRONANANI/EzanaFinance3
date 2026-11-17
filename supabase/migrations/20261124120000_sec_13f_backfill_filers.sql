-- 13F backfill: discovery by filer, and amendment types (Nov 17, 2026)
--
-- Follows 20261124100000_sec_13f_backfill.sql. Two findings from its first production run:
--   1. EDGAR full-text search returns only a fraction of 13F filings (50 on the Nov 16, 2026
--      deadline day), so discovery by day cannot make a quarter complete. Discovery now reads
--      each tracked filer's EDGAR submissions feed, which lists every filing with its report
--      date. sec_13f_backfill_filers tracks which filers have been read.
--   2. None of the 546 stored 13F-HR/A filings had an amendment type, so titans_13f_filing_set
--      could take a partial NEW HOLDINGS amendment as a filer's whole quarter. The parser now
--      records the type from the cover page, and a quarter is complete only when every
--      parsed amendment is typed.
-- Additive. The filer list is seeded from the filers already tracked.

create table if not exists public.sec_13f_backfill_filers (
  cik text primary key,
  attempts integer not null default 0,
  checked_at timestamptz,
  filings_found integer,
  error text
);
alter table public.sec_13f_backfill_filers enable row level security;
revoke all on public.sec_13f_backfill_filers from anon, authenticated;
grant all on public.sec_13f_backfill_filers to service_role;

do $migration$
begin
  if to_regclass('public.sec_filings') is not null then
    insert into public.sec_13f_backfill_filers (cik)
    select distinct cik from public.sec_filings where form_family = 'institutional' and cik is not null
    on conflict (cik) do nothing;
  end if;
end;
$migration$;

create or replace function public.sec_13f_quarter_completeness(p_period date)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_period date := (date_trunc('quarter', p_period) + interval '3 months' - interval '1 day')::date;
  v_prior date := (date_trunc('quarter', p_period) - interval '1 day')::date;
  v_next date := (date_trunc('quarter', p_period) + interval '6 months' - interval '1 day')::date;
  r jsonb;
begin
  with f as (
    select s.accession_no, s.cik, s.table_entry_total, s.form_type, s.amendment_type
      from public.sec_filings s
     where s.form_family = 'institutional' and s.period_of_report = v_period
  ),
  h as (
    select h.accession_no, count(*) as n
      from public.sec_13f_holdings h
     where h.accession_no in (select accession_no from f)
     group by 1
  ),
  j as (
    select f.*, coalesce(h.n, 0) as n from f left join h using (accession_no)
  ),
  fl as (
    select count(*) filter (where checked_at is null) as open,
           count(*) as total
      from public.sec_13f_backfill_filers
  ),
  d as (
    select count(*) filter (where status = 'pending') as pending,
           count(*) filter (where status = 'failed') as failed,
           count(*) filter (where status = 'truncated') as truncated,
           count(*) as planned
      from public.sec_13f_backfill_days where period = v_period
  ),
  -- The reference: the larger of the neighbouring materialised quarters and this quarter's
  -- own indexed filers, so a thin neighbour can never make a thin quarter look complete.
  ref as (
    select greatest(
      coalesce((select count(*) from public.titans_13f_filers where period = v_prior), 0),
      coalesce((select count(*) from public.titans_13f_filers where period = v_next), 0),
      (select count(distinct cik) from f)
    ) as filers
  ),
  agg as (
    select count(*) as indexed,
           count(distinct cik) as filers_indexed,
           count(*) filter (where n > 0) as parsed,
           count(distinct cik) filter (where n > 0) as filers_parsed,
           coalesce(sum(n), 0) as holding_rows,
           count(*) filter (where n > 0 and table_entry_total is not null) as declared_known,
           count(*) filter (where n > 0 and table_entry_total is not null and table_entry_total <> n) as declared_mismatch,
           count(*) filter (where n > 0 and form_type ilike '%/A') as amendments,
           count(*) filter (where n > 0 and form_type ilike '%/A' and amendment_type is null) as amendments_untyped
      from j
  )
  select jsonb_build_object(
    'period', v_period,
    'indexed', a.indexed,
    'filers_indexed', a.filers_indexed,
    'parsed', a.parsed,
    'filers_with_holdings', a.filers_parsed,
    'unparsed', a.indexed - a.parsed,
    'holding_rows', a.holding_rows,
    'declared_known', a.declared_known,
    'declared_mismatch', a.declared_mismatch,
    'amendments', a.amendments,
    'amendments_untyped', a.amendments_untyped,
    'filers_tracked', fl.total,
    'filers_unchecked', fl.open,
    'days_planned', d.planned,
    'days_pending', d.pending,
    'days_failed', d.failed,
    'days_truncated', d.truncated,
    'reference_filers', ref.filers,
    'coverage', case when ref.filers > 0 then round(a.filers_parsed::numeric / ref.filers, 3) end,
    'checks', jsonb_build_object(
      'days_discovered', d.planned > 0 and d.pending = 0 and d.failed = 0 and d.truncated = 0,
      'parsed', a.indexed > 0 and (a.indexed - a.parsed) <= ceil(0.02 * a.indexed),
      'declared_known', a.parsed > 0 and a.declared_known >= 0.9 * a.parsed,
      'declared_match', a.declared_known > 0 and a.declared_mismatch <= floor(0.01 * a.declared_known),
      'coverage', ref.filers > 0 and a.filers_parsed >= 0.9 * ref.filers,
      'filers_checked', fl.total > 0 and fl.open = 0,
      'amendments_typed', a.amendments_untyped = 0
    )
  )
  into r
  from agg a, d, ref, fl;
  return r || jsonb_build_object(
    'complete',
    (select bool_and(value::boolean) from jsonb_each_text(r -> 'checks'))
  );
end;
$function$;

revoke all on function public.sec_13f_quarter_completeness(date) from public, anon, authenticated;
grant execute on function public.sec_13f_quarter_completeness(date) to service_role;
