-- 13F filing-progress counts for /datasets/institutional
-- (institutional-13f-filing-progress-fix.md). Definition and tests:
-- src/lib/datasets/institutional/filing-progress-model.js.
--
-- NOT executed by the implementer. Noah applies it by hand in the SQL Editor.
-- Additive and idempotent. Until it is applied, the app computes the same
-- counts from sec_filings rows in JS (src/lib/datasets/institutional/filingProgress.js).
--
-- Adapted to the real schema: the spec's thirteen_f_filings is
-- public.sec_filings (form_family = 'institutional'; cik, form_type,
-- filed_at, period_of_report, synced_at). Counts FILINGS, not parsed
-- holdings: a filing still waiting for the holdings parser has been filed.
--
--   filed                  distinct CIKs with an original 13F-HR for the
--                          period, plus CIKs whose only filing is a 13F-HR/A
--   expected               distinct CIKs with an original 13F-HR for the prior
--   prior_filed_by_offset  prior-period originals first filed by the same day
--   prior_coverage_start   earliest prior-period filing on record (pacing is
--                          unknowable when records start after the offset)
--   last_ingested_at       newest sec_filings.synced_at for the family

create or replace function public.thirteen_f_filing_progress(
  p_period date, p_prior date, p_day_offset int
) returns table (
  filed int,
  expected int,
  prior_filed_by_offset int,
  prior_coverage_start date,
  last_ingested_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with cur as (
    select cik, form_type
      from public.sec_filings
     where form_family = 'institutional'
       and period_of_report = p_period
       and form_type not ilike '%NT%'
  ),
  cur_filers as (
    select cik from cur where form_type not ilike '%/A'
    union
    select cik from cur c
     where c.form_type ilike '%/A'
       and not exists (select 1 from cur o where o.cik = c.cik and o.form_type not ilike '%/A')
  ),
  pri as (
    select cik, min(filed_at)::date as first_filed
      from public.sec_filings
     where form_family = 'institutional'
       and period_of_report = p_prior
       and form_type not ilike '%NT%'
       and form_type not ilike '%/A'
     group by cik
  )
  select
    (select count(*) from cur_filers)::int,
    (select count(*) from pri)::int,
    (select count(*) from pri where first_filed <= p_prior + p_day_offset)::int,
    (select min(first_filed) from pri),
    (select max(synced_at) from public.sec_filings where form_family = 'institutional');
$$;

revoke all on function public.thirteen_f_filing_progress(date, date, int) from public, anon;
grant execute on function public.thirteen_f_filing_progress(date, date, int)
  to authenticated, service_role;

create index if not exists sec_filings_inst_progress_idx
  on public.sec_filings (form_family, period_of_report, form_type, cik);
