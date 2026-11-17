-- 13F historical backfill: plan, completeness, guarded materialisation (Nov 17, 2026)
--
-- Why: the rolling filings ingest pulls the first 4,000 EDGAR hits of a two-day window,
-- so around a filing deadline most 13Fs are skipped (Q3 2026: 150 indexed against 1,550
-- for Q2). The holdings parser only covers the two most recent quarters and its retention
-- step deletes raw holdings older than that, so Q1 2026 raw rows are gone. And the hourly
-- snapshot materialised Q3 as "latest complete" the day its window closed, from 148 filers.
--
-- What this adds (additive; nothing is deleted):
--   sec_13f_backfill_days      one row per (quarter, filing day) to discover, worked by
--                              /api/cron/sec-13f-backfill
--   sec_13f_backfill_quarters  quarters under backfill. While a quarter is listed and not
--                              materialised, the holdings parser keeps its raw rows and the
--                              hourly snapshot does not rebuild it.
--   sec_13f_quarter_completeness(period)   the checks, as jsonb
--   sec_13f_materialise_if_complete(period) materialises only when every check passes
--   titans_materialisable_quarter()        the hourly snapshot's target, or null when the
--                              latest quarter is under backfill or covers under 90% of the
--                              prior quarter's filers
-- All service role only.

create table if not exists public.sec_13f_backfill_days (
  period date not null,
  day date not null,
  status text not null default 'pending'
    check (status in ('pending', 'done', 'truncated', 'failed')),
  attempts integer not null default 0,
  edgar_total integer,
  hits_seen integer,
  indexed integer,
  error text,
  updated_at timestamptz not null default now(),
  primary key (period, day)
);

create table if not exists public.sec_13f_backfill_quarters (
  period date primary key,
  status text not null default 'backfilling'
    check (status in ('backfilling', 'complete', 'materialised', 'blocked')),
  completeness jsonb,
  checked_at timestamptz,
  materialised_at timestamptz,
  materialised_rows integer,
  created_at timestamptz not null default now()
);

alter table public.sec_13f_backfill_days enable row level security;
alter table public.sec_13f_backfill_quarters enable row level security;
revoke all on public.sec_13f_backfill_days from anon, authenticated;
revoke all on public.sec_13f_backfill_quarters from anon, authenticated;
grant all on public.sec_13f_backfill_days to service_role;
grant all on public.sec_13f_backfill_quarters to service_role;

-- The parser records each filing's declared row count from its cover page.
do $migration$
begin
  if to_regclass('public.sec_filings') is not null then
    alter table public.sec_filings
      add column if not exists table_entry_total integer,
      add column if not exists table_value_total numeric;
  end if;
end;
$migration$;

-- Completeness of one quarter. Thresholds:
--   every planned filing day discovered (none pending, failed or truncated);
--   at most 2% of indexed filings unparsed;
--   the declared row count known for at least 90% of parsed filings, and matching the
--   parsed rows for at least 99% of those;
--   filers with holdings at least 90% of the reference (see ref below).
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
    select s.accession_no, s.cik, s.table_entry_total
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
           count(*) filter (where n > 0 and table_entry_total is not null and table_entry_total <> n) as declared_mismatch
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
      'coverage', ref.filers > 0 and a.filers_parsed >= 0.9 * ref.filers
    )
  )
  into r
  from agg a, d, ref;
  return r || jsonb_build_object(
    'complete',
    (select bool_and(value::boolean) from jsonb_each_text(r -> 'checks'))
  );
end;
$function$;

-- Materialise a quarter only when it is complete. Otherwise changes nothing.
create or replace function public.sec_13f_materialise_if_complete(p_period date)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_period date := (date_trunc('quarter', p_period) + interval '3 months' - interval '1 day')::date;
  c jsonb := public.sec_13f_quarter_completeness(p_period);
  v_rows integer;
begin
  update public.sec_13f_backfill_quarters
     set completeness = c, checked_at = now(),
         status = case when status = 'materialised' then status
                       when (c ->> 'complete')::boolean then 'complete' else status end
   where period = v_period;
  if not coalesce((c ->> 'complete')::boolean, false) then
    return jsonb_build_object('materialised', false, 'completeness', c);
  end if;
  v_rows := public.titans_13f_materialise(v_period);
  update public.sec_13f_backfill_quarters
     set status = 'materialised', materialised_at = now(), materialised_rows = v_rows
   where period = v_period;
  return jsonb_build_object('materialised', true, 'rows', v_rows, 'completeness', c);
end;
$function$;

-- The hourly snapshot's target: the latest complete quarter, unless it is under backfill
-- (and not yet materialised by the check above) or its parsed filers are under 90% of the
-- prior quarter's materialised filers. Null means: rebuild nothing this hour.
create or replace function public.titans_materialisable_quarter()
returns date
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  q date := public.titans_latest_complete_quarter();
  v_prior date := (date_trunc('quarter', q) - interval '1 day')::date;
  v_filers integer;
  v_ref integer;
begin
  if exists (select 1 from public.sec_13f_backfill_quarters
              where period = q and status <> 'materialised') then
    return null;
  end if;
  select count(distinct s.cik) into v_filers
    from public.sec_filings s
   where s.form_family = 'institutional' and s.period_of_report = q
     and exists (select 1 from public.sec_13f_holdings h where h.accession_no = s.accession_no);
  select count(*) into v_ref from public.titans_13f_filers where period = v_prior;
  if v_ref > 0 and v_filers < 0.9 * v_ref then
    return null;
  end if;
  return q;
end;
$function$;

create or replace function public.refresh_titans_institutional_latest()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  q date := public.titans_materialisable_quarter();
begin
  if q is null then
    return jsonb_build_object(
      'skipped', true,
      'reason', 'latest quarter is incomplete or under backfill',
      'quarter', public.titans_latest_complete_quarter()
    );
  end if;
  return public.refresh_titans_institutional(q, 25);
end;
$function$;

revoke all on function public.sec_13f_quarter_completeness(date) from public, anon, authenticated;
revoke all on function public.sec_13f_materialise_if_complete(date) from public, anon, authenticated;
revoke all on function public.titans_materialisable_quarter() from public, anon, authenticated;
revoke all on function public.refresh_titans_institutional_latest() from public, anon, authenticated;
grant execute on function public.sec_13f_quarter_completeness(date) to service_role;
grant execute on function public.sec_13f_materialise_if_complete(date) to service_role;
grant execute on function public.titans_materialisable_quarter() to service_role;
grant execute on function public.refresh_titans_institutional_latest() to service_role;
