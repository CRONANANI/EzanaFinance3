/**
 * Pure scaling logic for the OECD explorer (wireframe 3a). No React, no DOM —
 * every "don't let one outlier flatten the axis" rule lives here so it can be
 * reasoned about and tested independently.
 *
 * Colour outputs are ALWAYS built from theme tokens via color-mix — never a
 * literal rgba(). The prototype used literals because it has no token system;
 * this codebase does, and the hex-check gate enforces it.
 */
import { PROJECTION_FROM_YEAR, OECD_SERIES_BY_SLUG } from './oecd-curated';

/** Coerce the RPC's numeric-as-string / null into a finite number or null. */
export function toNum(v) {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Rank-normalize one indicator across countries → 0..1 per area code.
 * `inv` indicators are flipped so 1 always means "stronger". Areas with a
 * null/missing value are omitted from the map entirely — they must not
 * participate in the colour scale (the caller renders an em-dash instead).
 *
 * `valuesByArea`: { [areaCode]: number | null }
 * Returns: { [areaCode]: number in [0,1] } (missing areas absent).
 */
export function normalizeIndicator(valuesByArea, { inv = false } = {}) {
  const entries = Object.entries(valuesByArea)
    .map(([area, v]) => [area, toNum(v)])
    .filter(([, v]) => v != null);
  const out = {};
  if (entries.length === 0) return out;
  let min = Infinity;
  let max = -Infinity;
  for (const [, v] of entries) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min;
  for (const [area, v] of entries) {
    // Degenerate range (all equal) → everyone mid-scale.
    let n = span === 0 ? 0.5 : (v - min) / span;
    if (inv) n = 1 - n;
    out[area] = n;
  }
  return out;
}

/** Quantile helpers over a sorted numeric array. */
function quantile(sorted, p) {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Build the quantile context for a column of values (used by heatmapCellStyle
 * for unsigned indicators). Pass the raw numeric values of the column.
 */
export function columnQuantiles(values) {
  const nums = values
    .map(toNum)
    .filter((v) => v != null)
    .sort((a, b) => a - b);
  return {
    count: nums.length,
    min: nums.length ? nums[0] : null,
    max: nums.length ? nums[nums.length - 1] : null,
    median: quantile(nums, 0.5),
    p25: quantile(nums, 0.25),
    p75: quantile(nums, 0.75),
  };
}

/**
 * Heatmap cell background for a value.
 *  - signed: diverging around zero — emerald for >=0, red for <0, alpha scaled
 *    by the value's magnitude relative to the column max (base .06, up to +.20).
 *  - unsigned: quantile tint — emerald above the median, red below, alpha up to
 *    .28 scaled by distance to the median in quantile space, so a single outlier
 *    cannot blow out the ramp.
 * Returns a CSS color string built from tokens via color-mix (or 'transparent'
 * for a missing/median value).
 */
export function heatmapCellStyle(value, q, { signed = false } = {}) {
  const v = toNum(value);
  if (v == null) return 'transparent';

  if (signed) {
    const scale = Math.max(Math.abs(q?.min ?? 0), Math.abs(q?.max ?? 0)) || 1;
    const mag = Math.min(1, Math.abs(v) / scale);
    const alpha = 6 + 20 * mag; // 6% … 26%
    const token = v >= 0 ? '--emerald' : '--negative';
    return `color-mix(in srgb, var(${token}) ${alpha.toFixed(1)}%, transparent)`;
  }

  const median = q?.median;
  if (median == null) return 'transparent';
  const above = v >= median;
  // Distance to the median expressed against the relevant half-range, so the
  // ramp is robust to outliers (p75/p25 anchor instead of raw max/min).
  const anchor = above ? (q.max ?? median) : (q.min ?? median);
  const halfSpan = Math.abs(anchor - median) || 1;
  const mag = Math.min(1, Math.abs(v - median) / halfSpan);
  const alpha = 28 * mag; // 0 … 28%
  const token = above ? '--emerald' : '--negative';
  return `color-mix(in srgb, var(${token}) ${alpha.toFixed(1)}%, transparent)`;
}

/**
 * Ranking bar geometry.
 *  - signed → diverging around a centered 50% zero line (each side capped at
 *    50% width; deficits extend left, surpluses right).
 *  - unsigned → left-anchored, width proportional to |value| / maxAbs.
 *  - clamped indicators cap the bar at the clamp and return offScale:true so the
 *    row can flag `▸ off-scale` instead of every other bar collapsing.
 * Returns { left, width, offScale } — left/width are percentages (numbers).
 */
export function rankingBarGeometry(value, { signed = false, clamp = null, maxAbs = 1 } = {}) {
  const v = toNum(value);
  if (v == null) return { left: 0, width: 0, offScale: false };

  const cap = clamp != null ? clamp : Infinity;
  const offScale = clamp != null && Math.abs(v) > clamp;
  const capped = Math.max(-cap, Math.min(cap, v));
  const denom = clamp != null ? cap : maxAbs || 1;

  if (signed) {
    const frac = Math.min(1, Math.abs(capped) / (denom || 1));
    const half = frac * 50;
    return capped >= 0
      ? { left: 50, width: half, offScale }
      : { left: 50 - half, width: half, offScale };
  }
  const frac = Math.min(1, Math.abs(capped) / (denom || 1));
  return { left: 0, width: frac * 100, offScale };
}

/**
 * Human-readable scaling note for the ranking footer — surfaces the active rule
 * in words (per the design), so the reader knows why the axis behaves as it does.
 */
export function scalingNote(series) {
  if (!series) return '';
  if (series.clamp != null) {
    return `Bars are capped at ${series.clamp}${unitSuffix(series)} — values beyond that are marked ▸ off-scale so one outlier doesn't flatten the rest.`;
  }
  if (series.signed) {
    return 'Diverging scale around zero — surpluses extend right (emerald), deficits left (red).';
  }
  if (series.skew) {
    return 'Highly concentrated distribution — a few economies dominate, so most bars sit near the low end by design.';
  }
  return 'Linear scale, anchored at zero.';
}

function unitSuffix(series) {
  const u = series?.unitLabel || '';
  if (u.startsWith('%')) return '%';
  return '';
}

/** Format a value: `series.decimals` places, leading '+' for positive signed
 *  values. Returns '—' for null/undefined. */
export function formatValue(value, series) {
  const v = toNum(value);
  if (v == null) return '—';
  const decimals = series?.decimals ?? 1;
  const txt = v.toFixed(decimals);
  if (series?.signed && v > 0) return `+${txt}`;
  return txt;
}

/** True when the year is an OECD projection (>= PROJECTION_FROM_YEAR). */
export function isProjected(year) {
  return Number(year) >= PROJECTION_FROM_YEAR;
}

/** Convenience: resolve a slug to its series descriptor. */
export function seriesFor(slug) {
  return OECD_SERIES_BY_SLUG[slug] || null;
}
