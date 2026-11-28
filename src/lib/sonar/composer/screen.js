/**
 * Sonar 6.2 (Nov 28 2026): the multi-stage financial screen, pure part.
 *
 * A screen is: a universe (a GICS-level sector from ticker_sectors, or named tickers),
 * filters applied in the order the question states them, then a ranking by one measure.
 * Every value comes from a dataset read by screen-server.js; this module only decides who
 * passes, in what order, and records the funnel (how many companies each step kept and
 * why the others left), so the answer can show its own working.
 *
 * Values for a missing measure are null, and a company without the value a filter needs
 * is reported as "no data" for that filter, never silently passed or failed.
 *
 * Pure, deterministic, no imports.
 */

export const SCREEN_VERSION = 'screen-v1';

/**
 * Compositional sectors (compositional.js SECTORS) to the GICS-level sectors Ezana stores.
 * `exact: false` means the GICS sector is broader than what was asked (semiconductors are
 * one industry inside Information Technology); the answer says so.
 */
export const GICS_FOR = {
  semiconductors: { sector: 'Information Technology', exact: false },
  software: { sector: 'Information Technology', exact: false },
  technology: { sector: 'Information Technology', exact: true },
  banks: { sector: 'Financials', exact: false },
  energy: { sector: 'Energy', exact: true },
  defense: { sector: 'Industrials', exact: false },
  healthcare: { sector: 'Health Care', exact: true },
  utilities: { sector: 'Utilities', exact: true },
  real_estate: { sector: 'Real Estate', exact: true },
  retail: { sector: 'Consumer Discretionary', exact: false },
  airlines: { sector: 'Industrials', exact: false },
};

/**
 * Measures a screen can filter or rank on, with where the value comes from.
 * source: ratios (filed SEC annual figures), contracts (USAspending by fiscal year),
 * insider (Form 4 open-market purchases), congress (STOCK Act purchases), lobbying
 * (LD-2 filings of verified clients), holders13f (distinct 13F managers).
 */
export const SCREEN_MEASURES = {
  revenue_growth: { label: 'Revenue growth', source: 'ratios', key: 'revenue_growth', unit: 'pct' },
  earnings_growth: {
    label: 'Net income growth',
    source: 'ratios',
    key: 'earnings_growth',
    unit: 'pct',
  },
  margin: { label: 'Operating margin', source: 'ratios', key: 'operating_margin', unit: 'pct' },
  free_cash_flow: { label: 'Free cash flow', source: 'ratios', key: 'fcf', unit: 'usd' },
  debt: { label: 'Debt/equity', source: 'ratios', key: 'debt_to_equity', unit: 'x' },
  revenue: { label: 'Revenue', source: 'ratios', key: 'revenue', unit: 'usd' },
  gov_contract_value: {
    label: 'Federal obligations (latest FY)',
    source: 'contracts',
    key: 'contracts',
    unit: 'usd',
  },
  insider_buying: { label: 'Insider purchases', source: 'insider', key: 'insider', unit: 'usd' },
  congress_holders: {
    label: 'Members of Congress buying',
    source: 'congress',
    key: 'congress',
    unit: 'count',
  },
  lobbying_spend: {
    label: 'Lobbying spend (latest year)',
    source: 'lobbying',
    key: 'lobbying',
    unit: 'usd',
  },
  institutional_breadth: {
    label: '13F managers',
    source: 'holders13f',
    key: 'holders13f',
    unit: 'count',
  },
};

/** Measures the screen cannot compute yet (reported, never substituted). */
export const SCREEN_UNSUPPORTED = {
  pe_ratio:
    'P/E needs a point-in-time share price for every company in the universe; screening on it is not available yet.',
  short_interest: 'Short interest is not in Ezana’s data.',
  esg_score: 'ESG scores are not in Ezana’s data.',
};

/** The comparable number for a filter: percentages are stated in percent (20 means 20%). */
function threshold(f) {
  const m = SCREEN_MEASURES[f.metric];
  if (!m) return null;
  if (m.unit === 'pct') return Number(f.value) / 100;
  return Number(f.value);
}

function passes(value, f) {
  if (f.op === 'exists') return value != null && value > 0;
  const t = threshold(f);
  if (value == null || t == null || !Number.isFinite(t)) return null;
  return f.op === '>' ? value > t : f.op === '<' ? value < t : null;
}

/**
 * Applies the filters in order and ranks the survivors.
 * @param {object} p
 * @param {{ ticker: string, name?: string }[]} p.universe
 * @param {Record<string, Record<string, number|null>>} p.values  values[ticker][measureKey]
 * @param {{ metric: string, op: '>'|'<'|'exists', value?: number }[]} p.filters
 * @param {string|null} p.rankBy  a SCREEN_MEASURES id
 * @param {'descending'|'ascending'} [p.direction]
 * @param {number} [p.topN]
 * @returns {{ rows: object[], funnel: object[], unsupported: string[] }}
 */
export function applyScreen({
  universe,
  values,
  filters = [],
  rankBy = null,
  direction = 'descending',
  topN = 25,
}) {
  const unsupported = [];
  const funnel = [{ step: 'universe', label: 'Universe', count: universe.length }];
  let current = universe;
  for (const f of filters) {
    const m = SCREEN_MEASURES[f.metric];
    if (!m) {
      unsupported.push(
        SCREEN_UNSUPPORTED[f.metric] || `Screening on ${f.metric} is not available.`,
      );
      continue;
    }
    let noData = 0;
    const kept = [];
    for (const c of current) {
      const ok = passes(values[c.ticker]?.[m.key] ?? null, f);
      if (ok === null) noData += 1;
      else if (ok) kept.push(c);
    }
    funnel.push({
      step: `filter:${f.metric}`,
      label:
        f.op === 'exists'
          ? `${m.label} recorded`
          : `${m.label} ${f.op === '>' ? 'above' : 'below'} ${m.unit === 'pct' ? `${f.value}%` : f.value}`,
      count: kept.length,
      noData,
    });
    current = kept;
  }
  const rank = rankBy && SCREEN_MEASURES[rankBy];
  if (rankBy && !rank)
    unsupported.push(SCREEN_UNSUPPORTED[rankBy] || `Ranking by ${rankBy} is not available.`);
  const key = rank?.key || null;
  const withValue = key ? current.filter((c) => values[c.ticker]?.[key] != null) : current;
  const sorted = [...withValue].sort((a, b) => {
    if (!key) return a.ticker < b.ticker ? -1 : 1;
    const d = values[b.ticker][key] - values[a.ticker][key];
    const diff = direction === 'ascending' ? -d : d;
    return diff || (a.ticker < b.ticker ? -1 : 1);
  });
  if (key) {
    funnel.push({
      step: `rank:${rankBy}`,
      label: `Ranked by ${rank.label}`,
      count: sorted.length,
      noData: current.length - withValue.length,
    });
  }
  const rows = sorted.slice(0, topN).map((c, i) => ({
    rank: i + 1,
    ticker: c.ticker,
    name: c.name || c.ticker,
    values: values[c.ticker] || {},
  }));
  return { rows, funnel, unsupported };
}

/** The measures a screen needs values for, grouped by source. */
export function screenSources(filters = [], rankBy = null) {
  const out = new Set(['ratios']);
  for (const id of [...filters.map((f) => f.metric), rankBy].filter(Boolean)) {
    const m = SCREEN_MEASURES[id];
    if (m) out.add(m.source);
  }
  return [...out];
}

/**
 * Company comparison, pure part: each company's metrics, the leader per metric, and
 * whether fiscal years line up (a comparison across different fiscal year ends says so).
 */
export function compareCompanies(rows, metrics) {
  const leaders = {};
  for (const m of metrics) {
    const lowerIsBetter = m === 'debt_to_equity';
    const vals = rows.filter((r) => r.ratios?.[m] != null);
    if (vals.length < 2) continue;
    const best = vals.reduce((a, b) =>
      (lowerIsBetter ? b.ratios[m] < a.ratios[m] : b.ratios[m] > a.ratios[m]) ? b : a,
    );
    leaders[m] = best.ticker;
  }
  const ends = [...new Set(rows.map((r) => r.ratios?.fiscalYearEnd).filter(Boolean))];
  const months = new Set(ends.map((e) => String(e).slice(5, 7)));
  return {
    leaders,
    fiscalYearEnds: ends,
    aligned: months.size <= 1,
    missing: rows.filter((r) => metrics.some((m) => r.ratios?.[m] == null)).map((r) => r.ticker),
  };
}

/**
 * Government revenue dependence, pure part: federal obligations by fiscal year against
 * filed annual revenue. Obligations are not revenue (they are committed when a contract is
 * signed, recognised over years, and include pass-through); the ratio is an exposure
 * indicator, labelled as such.
 */
export function governmentDependence({
  byYear = [],
  agencies = [],
  revenue = null,
  fiscalYearEnd = null,
}) {
  const years = [...byYear].sort((a, b) => a.fiscal_year - b.fiscal_year);
  const latest = years[years.length - 1] || null;
  const prior = years[years.length - 2] || null;
  const ratio = latest && revenue ? latest.total / revenue : null;
  const growth = latest && prior && prior.total > 0 ? latest.total / prior.total - 1 : null;
  const total = agencies.reduce((t, a) => t + (a.total || 0), 0);
  const top = [...agencies]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((a) => ({
      ...a,
      share: total ? a.total / total : null,
    }));
  const hhi = total ? agencies.reduce((h, a) => h + (a.total / total) ** 2, 0) : null;
  return {
    latestFiscalYear: latest?.fiscal_year ?? null,
    latestObligations: latest?.total ?? null,
    priorObligations: prior?.total ?? null,
    obligationGrowth: growth,
    revenue,
    fiscalYearEnd,
    obligationsToRevenue: ratio,
    topAgencies: top,
    agencyConcentration: hhi,
    years,
  };
}
