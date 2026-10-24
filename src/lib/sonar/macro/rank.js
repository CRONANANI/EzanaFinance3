/**
 * Country rankings for Sonar's country_rank briefing (sonar-country-ranking
 * fix, B3). Pure; tested in scripts/check-macro-rank.mjs.
 *
 * Rules:
 *  - every ranking uses ONE year for every country: the newest year where at
 *    least 85% of sovereign economies report a value (never each country's
 *    own latest year);
 *  - regional and income aggregates never rank; territories are excluded by
 *    default and labelled when included;
 *  - equal values share a rank (1, 2, 2, 4);
 *  - projections never mix into observed rankings (rows carry measure_type).
 *
 * Row: { iso3, name, indicator, year, value, is_aggregate, is_territory,
 *        measure_type? }
 */

export const METRICS = {
  gdp_nominal_usd: {
    indicator: 'NY.GDP.MKTP.CD',
    label: 'Nominal GDP',
    unit: 'current US$',
    short: 'nominal GDP',
  },
  gdp_ppp: {
    indicator: 'NY.GDP.MKTP.PP.CD',
    label: 'GDP at PPP',
    unit: 'current international $',
    short: 'GDP at PPP',
  },
  gdp_per_capita_usd: {
    indicator: 'NY.GDP.PCAP.CD',
    label: 'GDP per capita',
    unit: 'current US$',
    short: 'GDP per capita',
  },
  gdp_per_capita_ppp: {
    indicator: 'NY.GDP.PCAP.PP.CD',
    label: 'GDP per capita, PPP',
    unit: 'current international $',
    short: 'GDP per capita at PPP',
  },
  gdp_growth_real: {
    indicator: 'NY.GDP.MKTP.KD.ZG',
    label: 'Real GDP growth',
    unit: '% a year',
    short: 'real GDP growth',
  },
};
export const POPULATION = 'SP.POP.TOTL';
export const WB_ATTRIBUTION = 'World Bank, World Development Indicators (CC BY 4.0)';
export const SCOPE_NOTE = 'Sovereign economies; excludes regional aggregates and territories.';

/* Territories and dependencies the World Bank reports as economies. They
   are excluded from economy rankings by default and labelled when shown. */
export const TERRITORIES = new Set([
  'ABW', // Aruba
  'ASM', // American Samoa
  'BMU', // Bermuda
  'CHI', // Channel Islands
  'CUW', // Curacao
  'CYM', // Cayman Islands
  'FRO', // Faroe Islands
  'GIB', // Gibraltar
  'GRL', // Greenland
  'GUM', // Guam
  'HKG', // Hong Kong SAR, China
  'IMN', // Isle of Man
  'MAC', // Macao SAR, China
  'MAF', // St. Martin (French part)
  'MNP', // Northern Mariana Islands
  'NCL', // New Caledonia
  'PRI', // Puerto Rico
  'PYF', // French Polynesia
  'SXM', // Sint Maarten (Dutch part)
  'TCA', // Turks and Caicos Islands
  'VGB', // British Virgin Islands
  'VIR', // Virgin Islands (U.S.)
]);

const sovereign = (r, includeTerritories = false) =>
  !r.is_aggregate && (includeTerritories || !(r.is_territory ?? TERRITORIES.has(r.iso3)));
const observed = (r) => !r.measure_type || r.measure_type !== 'forecast';
const hasValue = (r) => r.value != null && Number.isFinite(Number(r.value));

/** Sovereign economies with any observed value for the indicator. */
export function universeSize(rows, indicator) {
  const s = new Set();
  for (const r of rows) {
    if (r.indicator === indicator && sovereign(r) && observed(r) && hasValue(r)) s.add(r.iso3);
  }
  return s.size;
}

/** Newest year where >= minCoverage of the universe reports a value. */
export function latestCommonYear(rows, indicator, minCoverage = 0.85, universe = null) {
  const n = universe ?? universeSize(rows, indicator);
  if (!n) return null;
  const byYear = new Map();
  for (const r of rows) {
    if (r.indicator !== indicator || !sovereign(r) || !observed(r) || !hasValue(r)) continue;
    if (!byYear.has(r.year)) byYear.set(r.year, new Set());
    byYear.get(r.year).add(r.iso3);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  for (const y of years) if (byYear.get(y).size / n >= minCoverage) return y;
  return null;
}

/** Ranked list for one indicator and ONE year. Ties share a rank. */
export function rankCountries(rows, indicator, year, opts = {}) {
  const pool = rows.filter(
    (r) =>
      r.indicator === indicator &&
      r.year === year &&
      hasValue(r) &&
      observed(r) &&
      sovereign(r, opts.includeTerritories),
  );
  const seen = new Set();
  const uniq = pool.filter((r) => (seen.has(r.iso3) ? false : seen.add(r.iso3)));
  const sorted = [...uniq].sort(
    (a, b) => Number(b.value) - Number(a.value) || String(a.iso3).localeCompare(String(b.iso3)),
  );
  let rank = 0;
  let prev = null;
  return sorted.map((r, i) => {
    const v = Number(r.value);
    if (prev === null || v !== prev) rank = i + 1;
    prev = v;
    return {
      rank,
      iso3: r.iso3,
      name: r.name || r.iso3,
      value: v,
      year,
      of: sorted.length,
      ...((r.is_territory ?? TERRITORIES.has(r.iso3)) ? { territory: true } : {}),
    };
  });
}

/** One country's rank for each year (null where it has no value). */
export function rankHistory(rows, indicator, iso3, years) {
  return years.map((y) => {
    const r = rankCountries(rows, indicator, y).find((x) => x.iso3 === iso3);
    return { year: y, rank: r?.rank ?? null, of: r?.of ?? null, value: r?.value ?? null };
  });
}

/** The k economies either side of iso3 in a ranked list (itself included). */
export function neighbours(ranked, iso3, k = 3) {
  const i = ranked.findIndex((r) => r.iso3 === iso3);
  return i < 0 ? [] : ranked.slice(Math.max(0, i - k), i + k + 1);
}

/**
 * The bars for "Largest economies": the top n, plus the entity and its +-2
 * neighbours when it sits outside the top n.
 */
export function topWithEntity(ranked, iso3, n = 10, k = 2) {
  const top = ranked.slice(0, n);
  const i = ranked.findIndex((r) => r.iso3 === iso3);
  if (i < 0 || i < n) return { top, tail: [] };
  return { top, tail: ranked.slice(Math.max(n, i - k), i + k + 1) };
}

/** The gap to the economy one place above and one below. */
export function gapAround(ranked, iso3) {
  const i = ranked.findIndex((r) => r.iso3 === iso3);
  if (i < 0) return null;
  const me = ranked[i];
  const above = i > 0 ? ranked[i - 1] : null;
  const below = i < ranked.length - 1 ? ranked[i + 1] : null;
  return {
    me,
    above: above ? { ...above, gap: above.value - me.value } : null,
    below: below ? { ...below, gap: me.value - below.value } : null,
  };
}

/**
 * The precomputed payload (`dataset_snapshots` key macro:rankings): per
 * metric the common year, the full ranked list, and rank history for the
 * size metrics as compact arrays ({ iso3: [rank | null per year] }).
 */
export function buildRankingsPayload(rows, { historyFrom = 1990, source = 'world_bank' } = {}) {
  const metrics = {};
  for (const [id, m] of Object.entries(METRICS)) {
    const year = latestCommonYear(rows, m.indicator);
    if (year == null) continue;
    const ranked = rankCountries(rows, m.indicator, year);
    const entry = {
      id,
      indicator: m.indicator,
      label: m.label,
      unit: m.unit,
      year,
      of: ranked.length,
      ranked: ranked.map((r) => [r.iso3, r.rank, r.value]),
    };
    if (id !== 'gdp_growth_real') {
      const years = [];
      for (let y = historyFrom; y <= year; y += 1) years.push(y);
      const byYear = years.map(
        (y) => new Map(rankCountries(rows, m.indicator, y).map((r) => [r.iso3, r.rank])),
      );
      const history = {};
      for (const r of ranked) history[r.iso3] = byYear.map((mp) => mp.get(r.iso3) ?? null);
      entry.historyFrom = historyFrom;
      entry.history = history;
    }
    metrics[id] = entry;
  }
  const names = {};
  for (const r of rows) if (r.iso3 && r.name && !names[r.iso3]) names[r.iso3] = r.name;
  /* Size and growth: one year for both axes. */
  const g = metrics.gdp_growth_real;
  const s = metrics.gdp_nominal_usd || metrics.gdp_per_capita_usd;
  let scatter = null;
  if (g && s) {
    const year = Math.min(g.year, s.year);
    const size = new Map(rankCountries(rows, s.indicator, year).map((r) => [r.iso3, r.value]));
    const growth = rankCountries(rows, g.indicator, year);
    scatter = {
      year,
      sizeMetric: s.id,
      points: growth
        .filter((r) => size.has(r.iso3))
        .map((r) => [r.iso3, size.get(r.iso3), r.value]),
    };
  }
  return { source, attribution: WB_ATTRIBUTION, scope: SCOPE_NOTE, names, metrics, scatter };
}

/** Expand a payload metric back into ranked rows. */
export function rankedFrom(payload, metricId) {
  const m = payload?.metrics?.[metricId];
  if (!m) return [];
  return m.ranked.map(([iso3, rank, value]) => ({
    iso3,
    rank,
    value,
    name: payload.names?.[iso3] || iso3,
    year: m.year,
    of: m.of,
  }));
}

/** Everything the briefing shows for one country, read from the payload. */
export function countryRankView(payload, iso3) {
  if (!payload) return null;
  const out = { iso3, name: payload.names?.[iso3] || iso3, metrics: {} };
  for (const id of Object.keys(METRICS)) {
    const m = payload.metrics?.[id];
    if (!m) continue;
    const ranked = rankedFrom(payload, id);
    const me = ranked.find((r) => r.iso3 === iso3) || null;
    out.metrics[id] = {
      id,
      label: m.label,
      unit: m.unit,
      year: m.year,
      of: m.of,
      rank: me?.rank ?? null,
      value: me?.value ?? null,
      neighbours: me ? neighbours(ranked, iso3, 3) : [],
      bars: topWithEntity(ranked, iso3, 10, 2),
      gap: me ? gapAround(ranked, iso3) : null,
      history: m.history?.[iso3]
        ? m.history[iso3].map((rank, i) => ({ year: m.historyFrom + i, rank }))
        : null,
    };
  }
  if (payload.scatter) {
    out.scatter = {
      year: payload.scatter.year,
      sizeMetric: payload.scatter.sizeMetric,
      points: payload.scatter.points.map(([i3, size, growth]) => ({
        iso3: i3,
        name: payload.names?.[i3] || i3,
        size,
        growth,
      })),
    };
  }
  return out;
}
