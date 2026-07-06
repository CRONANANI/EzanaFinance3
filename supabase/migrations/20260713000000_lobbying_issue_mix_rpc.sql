-- Issue-mix (share of filings) for the Influence Ledger donut. Exact full-scope
-- counts over the whole period (not a capped row slice): distinct filings citing
-- each issue label, plus total_filings (all scoped filings) on every row so the
-- caller (/api/lobbying/by-issue) can derive share and the donut center. Honesty:
-- activity share, never dollars per issue (LDA doesn't itemize dollars per issue).
--
-- Period scoping mirrors the filings/top-spenders routes exactly:
--   q1–q4 → quarter column; range → dt_posted >= now() - p_days; else whole year.
create or replace function public.lobbying_issue_mix(
  p_year integer,
  p_period text default 'year',
  p_days integer default 90
)
returns table (issue text, filings bigint, total_filings bigint)
language sql
stable
as $$
  with scoped as (
    select f.uuid, f.issues
    from public.lobbying_filings f
    where f.filing_year = p_year
      and case
        when lower(coalesce(p_period, 'year')) in ('q1', 'q2', 'q3', 'q4')
          then f.quarter = lower(p_period)
        when lower(coalesce(p_period, 'year')) = 'range'
          then f.dt_posted >= now() - make_interval(days => greatest(coalesce(p_days, 90), 1))
        else true
      end
  ),
  total as (
    select count(*)::bigint as n from scoped
  ),
  per_filing_issue as (
    select distinct
      s.uuid,
      nullif(coalesce(elem->>'display', elem->>'code'), '') as issue_label
    from scoped s
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(s.issues) = 'array' then s.issues else '[]'::jsonb end
    ) as elem
  ),
  counts as (
    select issue_label as issue, count(*)::bigint as filings
    from per_filing_issue
    where issue_label is not null
    group by issue_label
  )
  select c.issue, c.filings, (select n from total) as total_filings
  from counts c
  order by c.filings desc
  limit 12;
$$;

grant execute on function public.lobbying_issue_mix(integer, text, integer)
  to anon, authenticated, service_role;
