/**
 * Pure scoring math for pitch competitions — shared by the judge scorecard and
 * the host scoreboard so they always agree. No I/O.
 *
 * A judge scores each criterion 0..max_score. A criterion's contribution is
 * normalized to a 0..1 fraction (score/max) then weighted; the weighted total is
 * reported on a 0..100 scale so criteria with different max scores compare fairly.
 */

/** Weighted 0..100 total for one judge's scores over a rubric.
 *  @param criteria [{ id, weight, max_score }]
 *  @param scoreById Map|object of criterionId -> raw score
 *  Returns { total, weightCovered } — total is null when nothing is scored yet. */
export function weightedTotal(criteria, scoreById) {
  const get = (id) => (scoreById instanceof Map ? scoreById.get(id) : scoreById?.[id]);
  let weightSum = 0;
  let acc = 0;
  let covered = 0;
  for (const c of criteria || []) {
    const w = Number(c.weight) || 0;
    const max = Number(c.max_score) || 0;
    if (w <= 0 || max <= 0) continue;
    weightSum += w;
    const raw = get(c.id);
    if (raw == null || raw === '') continue;
    const frac = Math.max(0, Math.min(1, Number(raw) / max));
    acc += frac * w;
    covered += w;
  }
  if (!weightSum || !covered) return { total: null, weightCovered: 0 };
  return { total: Math.round((acc / weightSum) * 100), weightCovered: covered / weightSum };
}

/**
 * Aggregate every judge's weighted total for a team into the team's mean.
 * @param perJudgeTotals array of numbers (each judge's 0..100 total, submitted or not)
 * Returns { mean, count } — mean null when no judge has scored. */
export function teamAggregate(perJudgeTotals) {
  const vals = (perJudgeTotals || []).filter((v) => v != null && Number.isFinite(v));
  if (!vals.length) return { mean: null, count: 0 };
  return { mean: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length), count: vals.length };
}

/** Clamp a raw score to [0, max]; returns null when not a finite number. */
export function clampScore(raw, max) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(Number(max) || 0, n));
}
