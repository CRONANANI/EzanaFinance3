/**
 * Pure maths for the Ezana API's Global Empire Lighthouse routes. No network,
 * no server imports: scripts/check-ezana-api-lighthouse.mjs tests it.
 *
 * Every Empire score, rank and composite comes from the shared Empire model
 * (oecd-empire-model.js and empire-rankings-model.js), the same code the
 * Global Empire Rankings page, Sonar and the OECD explorer use, so the API can
 * never disagree with them. The World Bank ranking reuses the common-year rule
 * from Sonar's macro rankings (sonar/macro/rank.js).
 */
import { empireComposite } from '@/app/datasets/oecd-macro/oecd-empire-model';
import {
  countryProfile,
  dimensionTableRows,
  pairRows,
} from '@/app/datasets/global-empire-lighthouse/empire-rankings-model';
import { latestCommonYear, TERRITORIES } from '@/lib/sonar/macro/rank';
import { OECD_AGGREGATE_AREAS } from '@/lib/oecd-curated';

const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
const round3 = (v) => (v == null ? null : Math.round(v * 1000) / 1000);

/* ── Empire ─────────────────────────────────────────────────────────── */

/** Dimension catalogue for meta: every dimension, live or pending. */
export function empireDimensionList(model) {
  if (!model) return [];
  const live = new Set(model.liveDims.map((d) => d.id));
  return [...model.liveDims, ...model.pendingDims].map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category || null,
    higher_is_better: d.higher_is_better !== false,
    live: live.has(d.id),
  }));
}

/** Composite ranking: countries meeting the 70% coverage rule, best first. */
export function empireRankings(model) {
  if (!model) return [];
  const live = model.liveDims.length;
  return empireComposite(model, model.liveDims).map((c, i) => ({
    rank: i + 1,
    iso3: c.iso,
    country: c.name,
    composite: round1(c.composite),
    coverage: round3(c.coverage),
    dimensions_scored: c.present,
    dimensions_live: live,
    strongest: c.strongest,
    weakest: c.weakest,
    year: model.year,
  }));
}

/**
 * The n strongest and n weakest dimensions of one country, by rank among all
 * countries (ties by score, then display order). The two lists never overlap,
 * so a country scored on fewer than 2n dimensions gets a shorter weakest list.
 * dims: [{ id, name, score, rank, order }]
 */
export function strongestWeakest(dims, n = 3) {
  const byRank = (dims || [])
    .filter((d) => d && d.rank != null)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        (b.score ?? -Infinity) - (a.score ?? -Infinity) ||
        (a.order ?? 0) - (b.order ?? 0),
    );
  const strongest = byRank.slice(0, n);
  const weakest = [...byRank]
    .reverse()
    .filter((d) => !strongest.includes(d))
    .slice(0, n);
  return { strongest, weakest };
}

const dimOut = (d) => ({
  id: d.id,
  name: d.name,
  category: d.category ?? null,
  score: d.score,
  rank: d.rank,
  of: d.of,
});

/** One country: dimension scores and ranks, strongest and weakest, composite rank. */
export function empireCountry(model, iso3) {
  const p = countryProfile(model, iso3);
  if (!p) return null;
  const { strongest, weakest } = strongestWeakest(p.dims, 3);
  return {
    iso3: p.iso,
    country: p.name,
    year: p.year,
    composite: p.composite,
    composite_rank: p.rank,
    ranked_countries: p.of,
    dimensions_scored: p.present,
    dimensions_live: p.live,
    dimensions: p.dims.map(dimOut),
    strongest: strongest.map(dimOut),
    weakest: weakest.map(dimOut),
  };
}

/** One live dimension's full ranking, strongest first (ties share a rank). */
export function empireDimension(model, dimId) {
  const dim = model?.liveDims.find((d) => d.id === dimId);
  if (!dim) return null;
  return {
    dimension: {
      id: dim.id,
      name: dim.name,
      category: dim.category || null,
      higher_is_better: dim.higher_is_better !== false,
    },
    rows: dimensionTableRows(model, dim).map((r) => ({
      rank: r.rank,
      iso3: r.iso,
      country: r.country,
      score: r.score,
      of: r.of,
      year: model.year,
    })),
  };
}

/**
 * Leader per dimension for two countries. rows: [{ id, name, a, b }] with
 * oriented 0 to 100 scores (null when unscored). leader is the ISO3 of the
 * higher score, 'tie' when equal, null when either side is unscored; leads
 * counts dimensions led by a and by b, ties and unscored.
 */
export function compareLeaders(rows, isoA, isoB) {
  const leads = { a: 0, b: 0, ties: 0, unscored: 0 };
  const dimensions = (rows || []).map((r) => {
    let leader = null;
    if (r.a == null || r.b == null) leads.unscored += 1;
    else if (r.a > r.b) {
      leader = isoA;
      leads.a += 1;
    } else if (r.b > r.a) {
      leader = isoB;
      leads.b += 1;
    } else {
      leader = 'tie';
      leads.ties += 1;
    }
    return {
      id: r.id,
      name: r.name,
      a: r.a,
      b: r.b,
      gap: r.a == null || r.b == null ? null : round1(r.a - r.b),
      leader,
    };
  });
  return { dimensions, leads };
}

/** Country a vs b across every live dimension, with composite ranks. */
export function empireCompare(model, isoA, isoB) {
  if (!model?.scoreMap.has(isoA) || !model?.scoreMap.has(isoB)) return null;
  const composite = empireComposite(model, model.liveDims);
  const side = (iso) => {
    const at = composite.findIndex((c) => c.iso === iso);
    return {
      iso3: iso,
      country: model.nameByCode.get(iso) || iso,
      composite: at >= 0 ? round1(composite[at].composite) : null,
      composite_rank: at >= 0 ? at + 1 : null,
    };
  };
  const { dimensions, leads } = compareLeaders(pairRows(model, isoA, isoB), isoA, isoB);
  return {
    year: model.year,
    a: side(isoA),
    b: side(isoB),
    dimensions,
    leads,
  };
}

/* ── shared ranking ─────────────────────────────────────────────────── */

export function median(values) {
  const v = (values || []).filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/**
 * Rank items on `value`: 'highest' (default) or 'lowest' first. Equal values
 * share a rank (1, 2, 2, 4); ties are listed by code. Adds rank and of.
 */
export function rankWithTies(items, order = 'highest') {
  const sign = order === 'lowest' ? 1 : -1;
  const sorted = (items || [])
    .filter((x) => x.value != null && Number.isFinite(x.value))
    .sort((a, b) => sign * (a.value - b.value) || String(a.code).localeCompare(String(b.code)));
  let rank = 0;
  let prev = null;
  return sorted.map((x, i) => {
    if (prev === null || x.value !== prev) rank = i + 1;
    prev = x.value;
    return { ...x, rank, of: sorted.length };
  });
}

/* ── World Bank ─────────────────────────────────────────────────────── */

/** The year with the most reporting economies (newest on a tie). */
export function bestCoveredYear(rows, indicator) {
  const byYear = new Map();
  for (const r of rows || []) {
    if (r.indicator !== indicator || r.value == null || r.is_territory) continue;
    if (!byYear.has(r.year)) byYear.set(r.year, new Set());
    byYear.get(r.year).add(r.iso3);
  }
  let best = null;
  for (const [y, s] of byYear) {
    if (!best || s.size > best.n || (s.size === best.n && y > best.y)) best = { y, n: s.size };
  }
  return best ? best.y : null;
}

/**
 * Countries ranked on one World Bank indicator for ONE common year: the
 * requested year, else the newest year where at least 85% of reporting
 * economies have a value (Sonar's rule), else the best-covered year.
 * Regional and income-group aggregates never reach these rows (the World Bank
 * load leaves them out); territories rank and are flagged.
 * rows: [{ iso3, name, indicator, year, value }]
 */
export function worldBankRanking(rows, indicator, { year = null, order = 'highest' } = {}) {
  const tagged = (rows || []).map((r) => ({
    ...r,
    is_aggregate: false,
    is_territory: TERRITORIES.has(r.iso3),
  }));
  let rule = 'requested';
  let y = year;
  if (y == null) {
    y = latestCommonYear(tagged, indicator);
    rule = 'common_85';
    if (y == null) {
      y = bestCoveredYear(tagged, indicator);
      rule = 'best_covered';
    }
  }
  if (y == null) return { year: null, rule: null, rows: [] };
  const seen = new Set();
  const pool = tagged
    .filter((r) => r.indicator === indicator && r.year === y && r.value != null)
    .filter((r) => (seen.has(r.iso3) ? false : seen.add(r.iso3)))
    .map((r) => ({ code: r.iso3, name: r.name, value: r.value, territory: r.is_territory }));
  return {
    year: y,
    rule,
    rows: rankWithTies(pool, order).map((r) => ({
      rank: r.rank,
      iso3: r.code,
      country: r.name || r.code,
      value: r.value,
      year: y,
      of: r.of,
      territory: r.territory,
    })),
  };
}

/* ── OECD ───────────────────────────────────────────────────────────── */

/**
 * Cross-country ranking of one OECD series on ONE year: the latest year most
 * countries report (newest on a tie), aggregates (OECD, euro area, world...)
 * left out. change is the move on the prior year when the prior observation
 * is that year. rows: oecd latest-observation rows.
 */
export function oecdRanking(rows, { order = 'highest', projectionFrom = Infinity } = {}) {
  const countries = (rows || []).filter(
    (r) => !OECD_AGGREGATE_AREAS.includes(r.ref_area) && r.latest_value != null,
  );
  const byYear = new Map();
  for (const r of countries) byYear.set(r.latest_year, (byYear.get(r.latest_year) || 0) + 1);
  let year = null;
  for (const [y, n] of byYear) {
    if (year == null || n > byYear.get(year) || (n === byYear.get(year) && y > year)) year = y;
  }
  if (year == null) return { year: null, rows: [] };
  const pool = countries
    .filter((r) => r.latest_year === year)
    .map((r) => ({
      code: r.ref_area,
      name: r.ref_area_name || r.ref_area,
      value: Number(r.latest_value),
      prior:
        r.prior_year === year - 1 && r.prior_value != null && Number.isFinite(Number(r.prior_value))
          ? Number(r.prior_value)
          : null,
      unit: r.unit_label || null,
    }));
  return {
    year,
    rows: rankWithTies(pool, order).map((r) => ({
      rank: r.rank,
      iso3: r.code,
      country: r.name,
      value: r.value,
      prior_value: r.prior,
      change: r.prior == null ? null : Math.round((r.value - r.prior) * 1e6) / 1e6,
      unit: r.unit,
      year,
      projection: year >= projectionFrom,
      of: r.of,
    })),
  };
}

/* ── Geopolitical risk ──────────────────────────────────────────────── */

const monthIndex = (period) => {
  const m = /^(\d{4})-(\d{2})/.exec(String(period || ''));
  return m ? Number(m[1]) * 12 + Number(m[2]) - 1 : null;
};

/**
 * Countries whose geopolitical risk rose most: the mean of each country's
 * last `recent` months against the median of the `baseline` months before
 * them. Only countries reporting the newest month in the data and at least
 * `minBaseline` baseline months qualify. Largest rise first.
 * rows: [{ iso3, name, period: 'YYYY-MM-DD', value }]
 */
export function gprMovers(rows, { recent = 3, baseline = 60, minBaseline = 24 } = {}) {
  const clean = (rows || []).filter(
    (r) => r && r.value != null && Number.isFinite(Number(r.value)) && monthIndex(r.period) != null,
  );
  if (!clean.length) return [];
  const latest = Math.max(...clean.map((r) => monthIndex(r.period)));
  const recentFrom = latest - recent + 1;
  const baseFrom = recentFrom - baseline;
  const by = new Map();
  for (const r of clean) {
    if (!by.has(r.iso3)) by.set(r.iso3, []);
    by.get(r.iso3).push(r);
  }
  const out = [];
  for (const [iso3, list] of by) {
    const latestRow = list.find((r) => monthIndex(r.period) === latest);
    if (!latestRow) continue;
    const rec = list.filter((r) => monthIndex(r.period) >= recentFrom).map((r) => Number(r.value));
    const base = list
      .filter((r) => {
        const i = monthIndex(r.period);
        return i >= baseFrom && i < recentFrom;
      })
      .map((r) => Number(r.value));
    if (!rec.length || base.length < minBaseline) continue;
    const mean = rec.reduce((s, v) => s + v, 0) / rec.length;
    const med = median(base);
    const rise = mean - med;
    out.push({
      iso3,
      country: latestRow.name || iso3,
      latest_month: String(latestRow.period).slice(0, 7),
      latest_value: Number(latestRow.value),
      recent_mean: round3(mean),
      baseline_median: round3(med),
      rise: round3(rise),
      rise_pct: med > 0 ? round1((rise / med) * 100) : null,
      baseline_months: base.length,
    });
  }
  return out.sort((a, b) => b.rise - a.rise || a.iso3.localeCompare(b.iso3));
}
