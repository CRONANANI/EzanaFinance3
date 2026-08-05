/**
 * Client-side model for the explorer matrix's EMPIRE-DIMENSION view. Rebuilds the
 * serializable `empireMatrix` payload from `getEmpireMatrixData()` into the Maps
 * the matrix needs. Live-only — null when the backbone is unavailable. Pure.
 */

/** null when the payload is missing / carries no scores. */
export function buildEmpireMatrixModel(payload) {
  if (!payload || !Array.isArray(payload.scores) || payload.scores.length === 0) return null;

  const scoreMap = new Map(); // iso3 -> Map<dimId, score(0-100)>
  for (const r of payload.scores) {
    if (r.score == null) continue;
    if (!scoreMap.has(r.iso3)) scoreMap.set(r.iso3, new Map());
    scoreMap.get(r.iso3).set(r.dimensionId, r.score);
  }

  const metricValueMap = new Map(); // iso3 -> Map<metricId, { value, year }>
  for (const r of payload.metricValues || []) {
    if (!metricValueMap.has(r.iso3)) metricValueMap.set(r.iso3, new Map());
    metricValueMap.get(r.iso3).set(r.metricId, { value: r.value, year: r.year });
  }

  const dims = Array.isArray(payload.dimensions) ? payload.dimensions : [];
  const orderedDims = [...dims].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const liveDims = orderedDims.filter((d) => d.has_data);
  const dimById = new Map(orderedDims.map((d) => [d.id, d]));

  const countries = (payload.countries || []).map((c) => ({ iso: c.code, name: c.name }));
  countries.sort((a, b) => a.name.localeCompare(b.name));

  return {
    year: payload.year,
    dimensions: orderedDims,
    liveDims,
    dimById,
    metrics: payload.metrics || {},
    scoreMap,
    metricValueMap,
    countries,
    totalDims: dims.length || 18,
    liveCount: liveDims.length,
  };
}

/** Score for a (country, dimension), or null. */
export function empireScore(model, iso, dimId) {
  const v = model.scoreMap.get(iso)?.get(dimId);
  return v == null || !Number.isFinite(v) ? null : v;
}

/** Latest raw metric observation { value, year } for a (country, metric), or null. */
export function empireMetric(model, iso, metricId) {
  return model.metricValueMap.get(iso)?.get(metricId) || null;
}
