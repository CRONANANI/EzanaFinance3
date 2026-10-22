-- Quarterly Rhythm, default view: read the table directly when no filter is
-- set instead of collecting every filing uuid and joining back. Same output
-- (checked against the previous definition, with and without filters);
-- 52s down to 3.9s for the unfiltered view under ingest load on Oct 21, 2026.
-- Each UNION ALL branch is gated on the filter set, so only one runs.
create or replace function public.lobbying_page_rhythm(p jsonb)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  with q as (select p - 'year' - 'quarters' - 'from' - 'to' as f),
  s as materialized (
    select f.filing_year, f.quarter, f.amount, f.is_registration
    from public.lobbying_filings f, q
    where q.f = '{}'::jsonb
      and f.filing_year >= 2024 and f.quarter in ('q1', 'q2', 'q3', 'q4')
    union all
    select f.filing_year, f.quarter, f.amount, f.is_registration
    from public.lobbying_filings f, q
    where q.f <> '{}'::jsonb
      and f.uuid in (select public.lobbying_page_ids(p - 'year' - 'quarters' - 'from' - 'to'))
      and f.filing_year >= 2024 and f.quarter in ('q1', 'q2', 'q3', 'q4')
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'year', filing_year, 'quarter', quarter, 'filings', filings, 'spend', spend)
      order by filing_year, quarter), '[]'::jsonb)
  from (
    select filing_year, quarter, count(*) as filings,
           coalesce(sum(amount) filter (where amount > 0 and coalesce(is_registration, false) = false), 0) as spend
    from s group by filing_year, quarter
  ) x;
$$;

revoke all on function public.lobbying_page_rhythm(jsonb) from public, anon, authenticated;
grant execute on function public.lobbying_page_rhythm(jsonb) to service_role;
