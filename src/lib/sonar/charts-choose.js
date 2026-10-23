/**
 * Automatic chart chooser (sonar-ezanaql-coverage-prompt.md Step 5): pick
 * 2-4 charts from every adapter's series candidates by data shape, scored
 * against the cluster. Shape -> chart type follows Wilke-style defaults; a
 * small part-whole becomes a donut. The renderer draws line, bar/ranked_bar,
 * donut and timeline natively; scatter, choropleth, treemap and graph render
 * as honest stubs until a geo/graph pass.
 */

const SHAPE_TO_TYPE = {
  timeseries: 'line',
  categorical: 'bar',
  ranking: 'ranked_bar',
  pair_numeric: 'scatter',
  geo: 'choropleth',
  part_whole: 'treemap',
  network: 'graph',
};
const DRAWN = new Set(['line', 'bar', 'ranked_bar', 'donut', 'timeline']);

export function scoreCandidate(s, cluster) {
  let score = 0;
  if (cluster.groupBy && s.dim === cluster.groupBy.dim) score += 3;
  if (s.shape === 'timeseries' && cluster.timeWindow) score += 2;
  if (s.dataset === cluster.datasets[0]) score += 2;
  if (s.cardinality > 30 && s.shape !== 'ranking') score -= 2;
  if (!s.cardinality) score -= 5;
  return score;
}

export function chooseCharts(candidates, cluster, max = 4) {
  const perShape = new Map();
  const chosen = [];
  const ranked = candidates
    .map((s) => ({ s, score: scoreCandidate(s, cluster) }))
    .sort((a, b) => b.score - a.score);
  for (const { s } of ranked) {
    if (chosen.length >= max) break;
    const n = perShape.get(s.shape) || 0;
    if (n >= 2) continue; // max 2 of the same shape
    perShape.set(s.shape, n + 1);
    const type =
      s.shape === 'part_whole' && s.cardinality <= 5
        ? 'donut'
        : SHAPE_TO_TYPE[s.shape] || 'ranked_bar';
    /* A small part-whole over 5 slices ranks better as bars than a 12-slice
       donut; keep it readable. */
    const finalType = type === 'treemap' && s.cardinality <= 12 ? 'ranked_bar' : type;
    chosen.push({
      id: s.id,
      title: s.title,
      type: finalType,
      rows: Array.isArray(s.data) ? s.data : [],
      stub: !DRAWN.has(finalType),
    });
  }
  return chosen;
}
