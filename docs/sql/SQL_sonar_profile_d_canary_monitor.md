# Sonar Profile D canary monitor (read only)

Run in the Supabase SQL editor. It compares the canary profile with `current` on runs
since a start time, per depth.

The columns cover:

- completion: partial and deterministic-fallback runs
- latency: p50 and p90
- cost: list price, from the per-call usage recorded with each run
- per-role truncations, invalid outputs, timeouts and model fallbacks
- unsupported claims: claims the validator removed, as a share of all claims

Change the start time in the `params` CTE. Runs saved before Nov 28 2026 have no
`plan->models` and are skipped.

```sql
with params as (
  select timestamptz '2026-11-28 00:00:00+00' as since
),
runs as (
  select
    r.id,
    r.created_at,
    r.depth,
    r.status,
    r.partial,
    r.deterministic,
    r.duration_ms,
    coalesce(r.plan->'models'->>'profile', 'current') as profile,
    (r.plan->'models'->'usage'->>'usd')::numeric as usd,
    (r.plan->'models'->'outcomes'->>'calls')::int as role_calls,
    (r.plan->'models'->'outcomes'->>'truncated')::int as truncated,
    (r.plan->'models'->'outcomes'->>'invalid_output')::int as invalid_output,
    (r.plan->'models'->'outcomes'->>'timeout')::int as timeouts,
    (r.plan->'models'->'outcomes'->>'provider_error')::int as provider_errors,
    (r.plan->'models'->'outcomes'->>'fallbacks')::int as fallbacks,
    (r.validation->>'claims')::int as claims,
    (r.validation->>'removed')::int as claims_removed
  from sonar_research_runs r, params p
  where r.created_at >= p.since
    and r.plan ? 'models'
)
select
  profile,
  depth,
  count(*) as runs,
  round(avg((status = 'complete')::int)::numeric, 3) as complete_rate,
  round(avg(partial::int)::numeric, 3) as partial_rate,
  round(avg(deterministic::int)::numeric, 3) as deterministic_rate,
  round((percentile_cont(0.5) within group (order by duration_ms) / 1000)::numeric, 1) as p50_s,
  round((percentile_cont(0.9) within group (order by duration_ms) / 1000)::numeric, 1) as p90_s,
  round(avg(usd), 4) as usd_per_run,
  round(sum(usd), 2) as usd_total,
  round(avg(truncated)::numeric, 2) as truncated_calls_per_run,
  round(avg(invalid_output)::numeric, 2) as invalid_outputs_per_run,
  round(avg(timeouts)::numeric, 2) as timeouts_per_run,
  round(avg(provider_errors)::numeric, 2) as provider_errors_per_run,
  sum(fallbacks) as model_fallbacks,
  round(sum(claims_removed)::numeric / nullif(sum(claims), 0), 3) as unsupported_claim_share
from runs
group by profile, depth
order by depth, profile;
```

Per-role detail: outcomes and cost by role, for the canary only.

```sql
with params as (
  select timestamptz '2026-11-28 00:00:00+00' as since, 'D'::text as profile
)
select
  role_row->>'role' as role,
  role_row->>'requested' as requested_model,
  role_row->>'served' as served_model,
  role_row->>'outcome' as outcome,
  count(*) as calls,
  round(avg((role_row->>'ms')::numeric) / 1000, 1) as avg_s,
  round(avg((role_row->>'outputTokens')::numeric)) as avg_output_tokens,
  count(*) filter (where role_row->'fellBackFrom' is not null and role_row->'fellBackFrom' <> 'null'::jsonb) as fallbacks
from sonar_research_runs r
cross join params p
cross join lateral jsonb_array_elements(coalesce(r.plan->'models'->'roles', '[]'::jsonb)) as role_row
where r.created_at >= p.since
  and r.plan->'models'->>'profile' = p.profile
group by 1, 2, 3, 4
order by 1, 4;
```
