/**
 * Pure shaping for the Global Empire Rankings page
 * (/datasets/global-empire-lighthouse). Every score, rank and composite comes
 * from the shared empire model (oecd-empire-model.js: buildEmpireModel,
 * empireComposite, empireRankWithin, normScore), so this page, the Sonar
 * EMPIRE RANKINGS row and the OECD explorer's empire mode can never disagree.
 * Nothing here scores anything; it only orders, groups and resolves the URL.
 *
 * No React, no network: covered by scripts/check-empire-rankings-page.mjs.
 */
import { empireComposite, empireRankWithin, normScore } from '../oecd-macro/oecd-empire-model';

export const PAGE_PATH = '/datasets/global-empire-lighthouse';

/* Category order for the dimension pill row. Anything the catalog adds later
   that is not listed here sorts after these, alphabetically. */
const CATEGORY_ORDER = ['Economic', 'Fundamentals', 'Social', 'Power Projection'];

/**
 * The old in-app page (/empire-ranking, now a redirect here) took
 * `?layers=a,b` from the Market Analysis "Show me data" button and scrolled to
 * the section mapped in its LAYER_SECTION_MAP:
 *
 *   trade          section-trade-power        → Trade
 *   conflict       section-conflict-risk      → Internal Conflict
 *   interest_rates section-interest-rates     → Debt Burden (the debt cycle card)
 *   economic       section-economic-power     → Economic Output
 *   military       section-military-power     → Military Strength
 *   energy         section-energy-power       → Resource Efficiency (energy use per unit of GDP)
 *   demographic    section-demographic-power  → no dimension measures demographics: composite
 *   governance     section-governance         → Rule of Law
 *   infrastructure section-infrastructure     → Infrastructure
 *
 * A layer whose dimension has no live data yet (Internal Conflict, Rule of Law
 * today) falls back to the composite, like an unknown layer.
 */
export const LAYER_TO_DIM = {
  trade: 'trade',
  conflict: 'internal_conflict',
  interest_rates: 'debt_burden',
  economic: 'economic_output',
  military: 'military_strength',
  energy: 'resource_efficiency',
  demographic: null,
  governance: 'rule_of_law',
  infrastructure: 'infrastructure',
};

const ISO3 = /^[A-Z]{3}$/;

/**
 * Resolve the page's query into what to show.
 *   params:   { dim?, country?, layers? } (strings or null, as read from the URL)
 *   liveIds:  ids of the live dimensions, in display order
 *   isoSet:   ISO3 codes the model knows (optional; when given, an unknown
 *             country is dropped rather than highlighted)
 * Returns { dimId, country, focus }:
 *   dimId    the live dimension the URL asked for, or null (no request, or
 *            not live): the pill row then shows its default, the first live
 *            dimension
 *   country  a known ISO3 or null
 *   focus    'dim' when the URL pointed at a dimension, 'composite' when it
 *            asked for a layer that maps to nothing live, else null
 * `dim` wins over `layers`; only the first layer counts, as on the old page.
 */
export function resolveEmpireQuery(params, liveIds, isoSet = null) {
  const live = new Set(liveIds || []);
  const rawDim = typeof params?.dim === 'string' ? params.dim.trim() : '';
  const rawLayers = typeof params?.layers === 'string' ? params.layers : '';
  const rawCountry = typeof params?.country === 'string' ? params.country.trim().toUpperCase() : '';

  let dimId = null;
  let focus = null;
  if (rawDim) {
    if (live.has(rawDim)) {
      dimId = rawDim;
      focus = 'dim';
    } else {
      focus = 'composite';
    }
  } else if (rawLayers) {
    const first = rawLayers
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)[0];
    const mapped = first && Object.hasOwn(LAYER_TO_DIM, first) ? LAYER_TO_DIM[first] : null;
    if (mapped && live.has(mapped)) {
      dimId = mapped;
      focus = 'dim';
    } else if (first) {
      focus = 'composite';
    }
  }

  let country = ISO3.test(rawCountry) ? rawCountry : null;
  if (country && isoSet && !isoSet.has(country)) country = null;

  return { dimId, country, focus };
}

/** The URL for one dimension's table, with an optional highlighted country. */
export function dimHref(dimId, iso = null) {
  const q = new URLSearchParams();
  q.set('dim', dimId);
  if (iso) q.set('country', iso);
  return `${PAGE_PATH}?${q.toString()}#dim-${dimId}`;
}

const round1 = (v) => Math.round(v * 10) / 10;

/**
 * Composite table rows: countries that meet the 70% coverage rule first, by
 * composite (empireComposite's order), then every other country with live
 * scores, by name, with rank and composite null. The two groups are never
 * interleaved.
 */
export function compositeTableRows(model) {
  if (!model) return [];
  const live = model.liveDims;
  const ranked = empireComposite(model, live).map((c, i) => ({
    id: c.iso,
    iso: c.iso,
    rank: i + 1,
    country: c.name,
    composite: round1(c.composite),
    present: c.present,
    live: live.length,
    strongest: c.strongest[0] || null,
    weakest: c.weakest[0] || null,
    year: model.year,
  }));
  const seen = new Set(ranked.map((r) => r.iso));
  const rest = model.countries
    .filter((c) => !seen.has(c.iso))
    .map((c) => {
      const present = live.filter(
        (d) => normScore(d, model.scoreMap.get(c.iso)?.get(d.id)) != null,
      ).length;
      return {
        id: c.iso,
        iso: c.iso,
        rank: null,
        country: c.name,
        composite: null,
        present,
        live: live.length,
        strongest: null,
        weakest: null,
        year: model.year,
      };
    })
    .sort((a, b) => a.country.localeCompare(b.country));
  return [...ranked, ...rest];
}

/**
 * One dimension's table: every country with a score, strongest first, with the
 * same rank empireRankWithin gives (tied scores share a rank). `score` is the
 * oriented 0 to 100 score (inverted where lower is better), one decimal.
 */
export function dimensionTableRows(model, dim) {
  if (!model || !dim) return [];
  const rows = [];
  for (const [iso, m] of model.scoreMap) {
    const n = normScore(dim, m.get(dim.id));
    if (n == null) continue;
    rows.push({ id: iso, iso, country: model.nameByCode.get(iso) || iso, n });
  }
  rows.sort((a, b) => b.n - a.n || a.country.localeCompare(b.country));
  const values = rows.map((r) => r.n);
  return rows.map((r) => ({
    id: r.id,
    iso: r.iso,
    country: r.country,
    rank: values.indexOf(r.n) + 1,
    of: rows.length,
    score: round1(r.n * 100),
  }));
}

/** Live dimensions grouped by category, in CATEGORY_ORDER then display order. */
export function groupDimsByCategory(dims) {
  const groups = new Map();
  for (const d of dims || []) {
    const key = d.category || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
  }
  const pos = (c) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...groups.entries()]
    .sort(([a], [b]) => pos(a) - pos(b) || a.localeCompare(b))
    .map(([category, list]) => ({
      category,
      dims: [...list].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    }));
}

/**
 * One country's read for the panel: composite rank (null below the coverage
 * rule), every live dimension it is scored on with rank and score, and its
 * three highest and three lowest by rank (ties by score, then display order).
 */
export function countryProfile(model, iso) {
  if (!model || !iso || !model.scoreMap.has(iso)) return null;
  const composite = empireComposite(model, model.liveDims);
  const at = composite.findIndex((c) => c.iso === iso);
  const dims = model.liveDims
    .map((d, order) => {
      const n = normScore(d, model.scoreMap.get(iso)?.get(d.id));
      if (n == null) return null;
      const r = empireRankWithin(model, d, iso);
      return {
        id: d.id,
        name: d.name,
        category: d.category || null,
        score: round1(n * 100),
        rank: r?.rank ?? null,
        of: r?.n ?? null,
        order,
      };
    })
    .filter(Boolean);
  const byRank = dims
    .filter((d) => d.rank != null)
    .sort((a, b) => a.rank - b.rank || b.score - a.score || a.order - b.order);
  const bottom = [...byRank]
    .reverse()
    .filter((d) => !byRank.slice(0, 3).includes(d))
    .slice(0, 3);
  return {
    iso,
    name: model.nameByCode.get(iso) || iso,
    rank: at >= 0 ? at + 1 : null,
    of: composite.length,
    composite: at >= 0 ? round1(composite[at].composite) : null,
    present: dims.length,
    live: model.liveDims.length,
    year: model.year,
    dims,
    top: byRank.slice(0, 3),
    bottom,
    leaderIso: composite[0]?.iso ?? null,
    runnerUpIso: composite[1]?.iso ?? null,
  };
}

/**
 * Radar / compare rows: one per live dimension where either country has a
 * score, with each country's oriented 0 to 100 score (null when missing).
 */
export function pairRows(model, isoA, isoB) {
  if (!model) return [];
  return model.liveDims
    .map((d) => {
      const a = normScore(d, model.scoreMap.get(isoA)?.get(d.id));
      const b = isoB ? normScore(d, model.scoreMap.get(isoB)?.get(d.id)) : null;
      if (a == null && b == null) return null;
      return {
        id: d.id,
        name: d.name,
        a: a == null ? null : round1(a * 100),
        b: b == null ? null : round1(b * 100),
      };
    })
    .filter(Boolean);
}
