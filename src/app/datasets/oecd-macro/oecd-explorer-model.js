/**
 * Shared, presentation-only data model for the OECD explorer. Turns the flat
 * `oecd_latest_observations` RPC payload into the lookups every section needs
 * (matrix, ranking, radar, profile) so each one reads from a single source of
 * truth instead of re-deriving. Pure — no React.
 *
 * Aggregates are partitioned out here: `countries` and `columnValues()` NEVER
 * include an aggregate area, so nothing downstream can accidentally rank or
 * colour-scale one. Aggregates are reachable only via `aggregate()`.
 */
import {
  OECD_CURATED_SERIES,
  OECD_AGGREGATE_AREAS,
  OECD_LENSES,
  OECD_HEADLINE_SLUGS,
} from '@/lib/oecd-curated';
import { toNum } from '@/lib/oecd-scales';

const AGG = new Set(OECD_AGGREGATE_AREAS);

/**
 * @returns {{
 *   bySlug: Record<string, Record<string, {value:number|null, year:number, prior:number|null, priorYear:number|null, name:string}>>,
 *   countries: Array<{iso:string, name:string}>,
 *   latestYearBySlug: Record<string, number|null>,
 * }}
 */
export function buildModel(latest) {
  const bySlug = {};
  const countryNames = new Map(); // iso -> name (non-aggregate only)

  if (Array.isArray(latest)) {
    for (const r of latest) {
      const slug = r.ezana_slug;
      const area = r.ref_area;
      if (!slug || !area) continue;
      (bySlug[slug] ||= {})[area] = {
        value: toNum(r.latest_value),
        year: r.latest_year,
        prior: toNum(r.prior_value),
        priorYear: r.prior_year ?? null,
        name: r.ref_area_name || area,
      };
      if (!AGG.has(area) && !countryNames.has(area)) {
        countryNames.set(area, r.ref_area_name || area);
      }
    }
  }

  const latestYearBySlug = {};
  for (const s of OECD_CURATED_SERIES) {
    const col = bySlug[s.slug] || {};
    // Most common latest year among non-aggregate countries with a value.
    const counts = new Map();
    for (const [area, cell] of Object.entries(col)) {
      if (AGG.has(area) || cell.value == null) continue;
      counts.set(cell.year, (counts.get(cell.year) || 0) + 1);
    }
    let best = null;
    let bestN = -1;
    for (const [year, n] of counts) {
      if (n > bestN) {
        best = year;
        bestN = n;
      }
    }
    latestYearBySlug[s.slug] = best;
  }

  const countries = [...countryNames.entries()]
    .map(([iso, name]) => ({ iso, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { bySlug, countries, latestYearBySlug };
}

/** Non-aggregate values for one indicator: { [iso]: number|null }. */
export function columnValues(model, slug) {
  const col = model.bySlug[slug] || {};
  const out = {};
  for (const [area, cell] of Object.entries(col)) {
    if (AGG.has(area)) continue;
    out[area] = cell.value;
  }
  return out;
}

/** One aggregate cell for the strip, or null when the indicator lacks it. */
export function aggregate(model, slug, area) {
  const cell = model.bySlug[slug]?.[area];
  if (!cell || cell.value == null) return null;
  return cell;
}

/** Slugs that make up a lens's columns (headline set when lens === 'all'). */
export function slugsForLens(lens) {
  if (lens === 'all') return OECD_HEADLINE_SLUGS;
  return OECD_CURATED_SERIES.filter((s) => s.lens === lens).map((s) => s.slug);
}

/** Every slug in a lens (for radar/profile, which use the full axis set). */
export function allSlugsForLens(lens) {
  if (lens === 'all') return OECD_CURATED_SERIES.map((s) => s.slug);
  return OECD_CURATED_SERIES.filter((s) => s.lens === lens).map((s) => s.slug);
}

export function lensLabel(lens) {
  if (lens === 'all') return 'All indicators';
  return OECD_LENSES.find((l) => l.id === lens)?.label || lens;
}

/**
 * Client-side rank of one area within an indicator, across non-aggregate
 * countries with a value. For `inv` indicators #1 is the BEST outcome (lowest
 * unemployment/debt). Returns { rank, n } or null when the area has no value.
 */
export function rankWithin(model, slug, iso, { inv = false } = {}) {
  const vals = columnValues(model, slug);
  const present = Object.entries(vals).filter(([, v]) => v != null);
  const mine = vals[iso];
  if (mine == null) return null;
  const n = present.length;
  // Sort so index 0 is "best": inv → ascending (lower better), else descending.
  const sorted = present.map(([, v]) => v).sort((a, b) => (inv ? a - b : b - a));
  const rank = sorted.indexOf(mine) + 1;
  return { rank, n };
}
