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
    label: 'New federal awards (latest FY)',
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
  /* Sonar 6.3: aligned means the latest fiscal years end within 45 days of each other;
     the same month in different years (a company that has not filed its newest year)
     is not aligned. */
  const times = ends.map((e) => Date.parse(e)).filter(Number.isFinite);
  const gapDays = times.length ? (Math.max(...times) - Math.min(...times)) / 86400000 : 0;
  return {
    leaders,
    fiscalYearEnds: ends,
    aligned: gapDays <= 45,
    missing: rows.filter((r) => metrics.some((m) => r.ratios?.[m] == null)).map((r) => r.ticker),
  };
}

/**
 * Government revenue dependence, pure part: federal obligations by fiscal year against
 * filed annual revenue. Obligations are not revenue (they are committed when a contract is
 * signed, recognised over years, and include pass-through); the ratio is an exposure
 * indicator, labelled as such.
 */
/** Months two [start, end) month ranges share (months counted as y*12+m). */
function overlapMonths(a0, a1, b0, b1) {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

/**
 * The federal fiscal year (Oct 1 to Sep 30) that shares the most months with a company's
 * fiscal year ending `fiscalYearEnd` (12 months). Ties go to the later federal year.
 */
export function federalFyForCompanyYear(fiscalYearEnd, candidates = []) {
  const m = String(fiscalYearEnd || '').match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const end = Number(m[1]) * 12 + Number(m[2]); // exclusive month index after the year end
  const start = end - 12;
  let best = null;
  for (const fy of candidates) {
    const f1 = fy * 12 + 9; // exclusive: the month after September of fy
    const f0 = f1 - 12;
    const months = overlapMonths(start, end, f0, f1);
    if (!best || months > best.months || (months === best.months && fy > best.fy))
      best = { fy, months };
  }
  return best && best.months > 0 ? best : null;
}

/**
 * Sonar 6.3 (Nov 28 2026): government dependence, with its measure named exactly.
 *
 * The contract rows are USAspending prime awards, each counted once in the federal fiscal
 * year its period of performance STARTS, at the amount obligated on it to date. So a year's
 * figure is the value of the awards that began that year (a vintage), not the money
 * obligated during that year; a recent vintage keeps growing as options are exercised.
 *
 * The revenue denominator is paired with the federal year that overlaps the company's
 * latest filed fiscal year most, and both periods are returned. The ratio is an exposure
 * indicator. Recognized government revenue (a segment disclosure) is a different figure;
 * it is returned only when the caller has it, never derived from contracts.
 */
export function governmentDependence({
  byYear = [],
  agencies = [],
  revenue = null,
  fiscalYearEnd = null,
  recognizedGovernmentRevenue = null,
  recognizedSegmentTotal = null,
}) {
  const years = [...byYear].sort((a, b) => a.fiscal_year - b.fiscal_year);
  const latest = years[years.length - 1] || null;
  const prior = years[years.length - 2] || null;
  const growth = latest && prior && prior.total > 0 ? latest.total / prior.total - 1 : null;
  const pair = federalFyForCompanyYear(
    fiscalYearEnd,
    years.map((y) => y.fiscal_year),
  );
  const paired = pair ? years.find((y) => y.fiscal_year === pair.fy) : null;
  const ratio = paired && revenue ? paired.total / revenue : null;
  const total = agencies.reduce((t, a) => t + (a.total || 0), 0);
  const top = [...agencies]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((a) => ({
      ...a,
      share: total ? a.total / total : null,
    }));
  const hhi = total ? agencies.reduce((h, a) => h + (a.total / total) ** 2, 0) : null;
  /* Share of the same disclosure's segment total when given (one source, one period);
     otherwise of filed revenue for that year. */
  const denom = Number.isFinite(recognizedSegmentTotal) ? recognizedSegmentTotal : revenue;
  const recognized =
    Number.isFinite(recognizedGovernmentRevenue) && denom
      ? recognizedGovernmentRevenue / denom
      : null;
  return {
    measure: 'award_vintage_value',
    measureLabel: 'Value of new federal prime awards (by start year, obligated to date)',
    latestFiscalYear: latest?.fiscal_year ?? null,
    latestObligations: latest?.total ?? null,
    priorObligations: prior?.total ?? null,
    obligationGrowth: growth,
    revenue,
    fiscalYearEnd,
    pairedFiscalYear: paired?.fiscal_year ?? null,
    pairedValue: paired?.total ?? null,
    pairedOverlapMonths: pair?.months ?? null,
    obligationsToRevenue: ratio,
    recognizedGovernmentRevenue: Number.isFinite(recognizedGovernmentRevenue)
      ? recognizedGovernmentRevenue
      : null,
    recognizedGovernmentShare: recognized,
    topAgencies: top,
    agencyConcentration: hhi,
    years,
  };
}
