/**
 * Client-side model for the explorer's EMPIRE mode. Turns the serializable
 * `empire` prop from `getEmpireScoresForExplorer()` into the lookups the radar,
 * profile and composite ranking need. Live-only: dimensions without data never
 * become axes; there is no mock path. Pure — no React.
 *
 * Backbone `score` is on a 0–100 scale (see normalizedToMockScale in the
 * dashboard). For radius/composite we normalize to 0–1 and, per the phase-4
 * spec, INVERT when `higher_is_better === false` so outward/greater always means
 * "stronger" — consistent with OECD mode's `inv` handling.
 */
import { dimensionIdsForFocus } from '@/lib/empire-dimension-groups';

/** null when the backbone is unavailable (unsynced / fetch failed). */
export function buildEmpireModel(empire) {
  if (!empire || !Array.isArray(empire.scores) || empire.scores.length === 0) return null;

  const scoreMap = new Map(); // iso3 -> Map<dimId, score(0-100)>
  for (const r of empire.scores) {
    if (r.score == null) continue;
    if (!scoreMap.has(r.iso3)) scoreMap.set(r.iso3, new Map());
    scoreMap.get(r.iso3).set(r.dimensionId, r.score);
  }

  const dims = Array.isArray(empire.dimensions) ? empire.dimensions : [];
  const liveDims = dims
    .filter((d) => d.has_data)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const pendingDims = dims.filter((d) => !d.has_data);

  const nameByCode = new Map((empire.countries || []).map((c) => [c.code, c.name]));
  // Countries that actually carry at least one live score.
  const countries = [...scoreMap.keys()]
    .map((code) => ({ iso: code, name: nameByCode.get(code) || code }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    year: empire.year,
    liveDims,
    pendingDims,
    totalDims: dims.length || 18,
    scoreMap,
    countries,
    nameByCode,
  };
}

/** 0–1, oriented so larger = stronger (inverted for higher_is_better === false). */
export function normScore(dim, rawScore) {
  if (rawScore == null || !Number.isFinite(rawScore)) return null;
  let n = Math.max(0, Math.min(1, rawScore / 100));
  if (dim && dim.higher_is_better === false) n = 1 - n;
  return n;
}

/** Live dimensions in a Focus group, ordered by display_order. */
export function empireAxesForFocus(model, focus) {
  const ids = dimensionIdsForFocus(focus); // null = all
  if (!ids) return model.liveDims;
  return model.liveDims.filter((d) => ids.has(d.id));
}

/** Rank of one country within a dimension, #1 = strongest, across countries with
 *  data. Returns { rank, n } or null. */
export function empireRankWithin(model, dim, iso) {
  const vals = [];
  let mine = null;
  for (const [code, m] of model.scoreMap) {
    const raw = m.get(dim.id);
    const n = normScore(dim, raw);
    if (n == null) continue;
    vals.push(n);
    if (code === iso) mine = n;
  }
  if (mine == null) return null;
  const sorted = vals.sort((a, b) => b - a);
  return { rank: sorted.indexOf(mine) + 1, n: sorted.length };
}

/**
 * Composite per country over a set of live dimensions: mean of normalized
 * (stronger-oriented) scores. Countries qualify only with coverage ≥ 70% of the
 * dimensions. Returns [{ iso, name, composite(0-100), coverage, present }]
 * sorted desc, plus the per-country strongest/weakest live dimensions.
 */
export function empireComposite(model, dims) {
  const dimList = dims && dims.length ? dims : model.liveDims;
  const need = Math.ceil(dimList.length * 0.7);
  const out = [];
  for (const { iso, name } of model.countries) {
    const parts = [];
    for (const dim of dimList) {
      const n = normScore(dim, model.scoreMap.get(iso)?.get(dim.id));
      if (n != null) parts.push({ dim, n });
    }
    if (parts.length < need || parts.length === 0) continue;
    const mean = parts.reduce((s, p) => s + p.n, 0) / parts.length;
    const ranked = [...parts].sort((a, b) => b.n - a.n);
    out.push({
      iso,
      name,
      composite: mean * 100,
      coverage: parts.length / dimList.length,
      present: parts.length,
      strongest: ranked.slice(0, 3).map((p) => p.dim.name),
      weakest: ranked
        .slice(-3)
        .reverse()
        .map((p) => p.dim.name),
    });
  }
  return out.sort((a, b) => b.composite - a.composite);
}
