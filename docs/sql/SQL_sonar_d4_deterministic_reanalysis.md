# Sonar d4 benchmark: deterministic re-analysis (read-only)

Nov 28 2026. These queries re-read the stored outputs of suite
`model-bench-2026-11-28-profile-d4` in `sonar_research_evaluations`. They use no model:
every figure comes from the deterministic score saved with each run, or is recomputed
from the saved output.

**Correction they apply:** the stored "findings without a valid citation" count did not
strip brackets from a citation (`[S1]`), although the citation-validity count did. The
Sonnet 5.5 writer cites with brackets and the Haiku 4.5 writer does not, so the stored
count overstated unsupported findings for Profile D. Query 1 recomputes the count from the
saved key findings and evidence markers. The scorer is fixed in code
(`src/lib/sonar/engine/eval/model-bench.js`).

The screen case (`screen_congress_contracts_13f`) is excluded from both queries: retrieval
failed in every cell.

## Query 1: per cell, current vs Profile D vs D with Haiku 5.5 specialists

```sql
with runs as (
  select id,
         metrics->'routing'->>'profile' as cell,
         metrics->>'depth'              as depth,
         benchmark_id                   as bid,
         metrics->'score'               as s,
         metrics->'output'              as o,
         coalesce((metrics->'usage'->'total'->>'usd')::numeric, (metrics->>'usd')::numeric, 0) as usd,
         (metrics->>'wallMs')::int      as ms
  from sonar_research_evaluations
  where suite_run = 'model-bench-2026-11-28-profile-d4'
    and engine = 'model-bench'
    and metrics->>'depth' in ('standard', 'deep')
    and metrics->'routing'->>'profile' in ('current', 'D', 'D-h55spec')
    and benchmark_id <> 'screen_congress_contracts_13f'
),
mk as (
  select r.id, array_agg(e->>'marker') as m
  from runs r, jsonb_array_elements(coalesce(r.o->'evidence', '[]'::jsonb)) e
  group by r.id
),
uf as (
  select r.id,
         count(kf) filter (where not exists (
           select 1 from jsonb_array_elements_text(coalesce(kf->'evidence', '[]'::jsonb)) ev
           where regexp_replace(ev, '^\[|\]$', '', 'g') = any(coalesce(mk.m, '{}'))
         )) as unsup_fixed
  from runs r
  left join lateral jsonb_array_elements(coalesce(r.o->'keyFindings', '[]'::jsonb)) kf on true
  left join mk on mk.id = r.id
  group by r.id
)
select r.depth, r.cell, count(*) as runs,
  round(avg(((r.s->>'completed')::boolean)::int), 3)                                     as completion,
  round(sum((r.s->'objectives'->>'met')::int)::numeric / sum((r.s->'objectives'->>'total')::int), 3) as objective_rate,
  round(sum((r.s->'numbers'->>'traced')::int)::numeric / nullif(sum((r.s->'numbers'->>'total')::int), 0), 4) as number_fidelity,
  round(sum((r.s->'citations'->>'valid')::int)::numeric
        / nullif(sum((r.s->'citations'->>'valid')::int + (r.s->'citations'->>'invalid')::int), 0), 3) as citation_validity,
  round(sum((r.s->'citations'->>'cited')::int)::numeric / nullif(sum((r.s->'citations'->>'findings')::int), 0), 3) as citation_coverage,
  round(avg(uf.unsup_fixed), 2)                                                             as unsupported_findings_per_run,
  round(avg((r.s->'unsupported'->>'findingsWithoutValidCitation')::int), 2)                 as unsupported_findings_stored,
  round(avg((r.s->'unsupported'->>'sentencesWithUntracedNumbers')::int), 2)                 as untraced_number_sentences_per_run,
  round(avg((r.s->'relationships'->>'validCrossInsights')::int), 2)                         as valid_cross_insights_per_run,
  sum((r.s->'relationships'->'failures'->>'join')::int)                                     as cross_join_failures,
  sum((r.s->'relationships'->'failures'->>'period')::int)                                   as cross_period_failures,
  round(avg(((r.s->'retrieval'->>'complete')::boolean)::int), 3)                            as retrieval_complete,
  round(avg(((r.s->'calcs'->>'ok')::boolean)::int), 3)                                      as calcs_ok,
  round(sum((r.s->'roles'->>'truncated')::int)::numeric / nullif(sum((r.s->'roles'->>'calls')::int), 0), 3) as truncated_share,
  round(avg(r.usd), 4)                                                                      as usd_per_run,
  percentile_cont(0.5) within group (order by r.ms)                                         as p50_ms
from runs r join uf on uf.id = r.id
group by r.depth, r.cell
order by r.depth, r.cell;
```

## Query 2: per case, paired against current (same case, same trial)

```sql
with runs as (
  select metrics->'routing'->>'profile' as cell, metrics->>'depth' as depth, benchmark_id as bid,
         coalesce((metrics->>'trial')::int, 0) as trial, metrics->'score' as s
  from sonar_research_evaluations
  where suite_run = 'model-bench-2026-11-28-profile-d4' and engine = 'model-bench'
    and metrics->>'depth' in ('standard', 'deep')
    and metrics->'routing'->>'profile' in ('current', 'D', 'D-h55spec')
    and benchmark_id <> 'screen_congress_contracts_13f'
)
select r.depth, r.bid, r.trial, r.cell,
  round((r.s->'objectives'->>'met')::numeric / (r.s->'objectives'->>'total')::int, 3) as objective_rate,
  (r.s->'numbers'->>'total')::int - (r.s->'numbers'->>'traced')::int                  as untraced_numbers,
  (r.s->'relationships'->>'validCrossInsights')::int                                  as valid_cross_insights,
  (r.s->'citations'->>'invalid')::int                                                 as invalid_citations
from runs r
order by r.depth, r.bid, r.trial, r.cell;
```
