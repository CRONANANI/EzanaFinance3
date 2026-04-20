-- =============================================================================
-- Empire Rankings data backbone — normalized scores view + matview + refresh fn
-- -----------------------------------------------------------------------------
-- The raw `country_scores_raw` table stores every upstream observation. This
-- migration derives the per-(country, dimension, year) composite 0-100 score
-- the UI actually renders.
--
-- Normalization rules:
--   • per (dimension, metric, year) min-max across all countries. Never
--     across years — cross-year normalization would distort time trends.
--   • metrics flagged invert=true are flipped so that higher normalized
--     score always means "better on this dimension".
--   • dimensions with only placeholder rows are excluded from the view;
--     the UI handles them with a "source pending" state.
--   • weighted mean across a dimension's metrics → final 0-100 score.
-- =============================================================================

create or replace view public.country_dimension_scores as
with scored as (
  select
    r.country_iso3,
    r.dimension_id,
    r.year,
    r.metric_id,
    r.source,
    r.raw_value,
    m.weight,
    m.invert,
    min(r.raw_value) over (partition by r.dimension_id, r.metric_id, r.year) as y_min,
    max(r.raw_value) over (partition by r.dimension_id, r.metric_id, r.year) as y_max
  from public.country_scores_raw r
  join public.dimension_metric_map m
    on m.dimension_id = r.dimension_id
   and m.metric_id = r.metric_id
   and m.source = r.source
  where r.source <> 'placeholder'
    and r.raw_value is not null
),
per_metric_score as (
  select
    country_iso3,
    dimension_id,
    year,
    metric_id,
    weight,
    case
      when y_max = y_min then 50
      when invert then (1 - (raw_value - y_min) / (y_max - y_min)) * 100
      else ((raw_value - y_min) / (y_max - y_min)) * 100
    end as metric_score
  from scored
)
select
  country_iso3,
  dimension_id,
  year,
  round(sum(metric_score * weight) / nullif(sum(weight), 0), 2) as score,
  count(*)::int as contributing_metrics
from per_metric_score
group by country_iso3, dimension_id, year;

comment on view public.country_dimension_scores is
  'Per (country, dimension, year) composite 0-100 score. Min-max normalized within each (dimension, metric, year), inverted where needed, weighted mean across metrics.';

-- ─── Materialized view for fast reads ─────────────────────────────────────────
-- The base view runs window functions over the raw table on every query;
-- the matview caches the result and is refreshed at the end of each sync.
create materialized view if not exists public.country_dimension_scores_mat as
  select * from public.country_dimension_scores
  with no data;

create index if not exists country_dimension_scores_mat_lookup_idx
  on public.country_dimension_scores_mat (year, dimension_id, country_iso3);

create index if not exists country_dimension_scores_mat_country_idx
  on public.country_dimension_scores_mat (country_iso3, year);

-- ─── Refresh function (callable from the sync job) ────────────────────────────
-- REFRESH MATERIALIZED VIEW requires view ownership; we wrap it in a
-- SECURITY DEFINER function so the service-role-authenticated API/cron can
-- trigger a refresh via rpc() without needing direct matview privileges.
create or replace function public.refresh_empire_scores_mat()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view public.country_dimension_scores_mat;
end;
$$;

revoke all on function public.refresh_empire_scores_mat() from public;
grant execute on function public.refresh_empire_scores_mat() to service_role;

notify pgrst, 'reload schema';
