/**
 * Stress-test math helpers for the Research → Market/Portfolio view.
 *
 * These implementations are intentionally simple and deterministic — they
 * produce directionally correct answers from a portfolio's sector breakdown
 * without relying on external historical price data. Swap the sector betas
 * for real historical returns once a proper backtest data source is wired.
 */

export const GICS_SECTORS = [
  'Technology',
  'Health Care',
  'Financials',
  'Consumer Discretionary',
  'Communication Services',
  'Industrials',
  'Consumer Staples',
  'Energy',
  'Utilities',
  'Real Estate',
  'Materials',
];

/**
 * Ray Dalio All Weather Portfolio target — risk-parity allocation designed
 * for balanced performance across growth / recession / inflation / deflation
 * regimes. These percentages are commonly cited; we surface them in the UI
 * as the Hedge-to-All-Weather suggestion.
 */
export const ALL_WEATHER_TARGET = [
  { label: 'Stocks', weight: 0.30, bucket: 'equities' },
  { label: 'Long-term Treasuries', weight: 0.40, bucket: 'bonds_long' },
  { label: 'Intermediate Treasuries', weight: 0.15, bucket: 'bonds_mid' },
  { label: 'Commodities', weight: 0.075, bucket: 'commodities' },
  { label: 'Gold', weight: 0.075, bucket: 'gold' },
];

/**
 * Sensitivity analysis — what happens to the portfolio if a single sector
 * moves by `shockPct` percent?
 *
 * @param {Array<{ sector: string, marketValue: number }>} positions
 * @param {string} sector
 * @param {number} shockPct  e.g. -10 means -10%
 * @returns {{ deltaUsd: number, deltaPct: number, sectorValue: number, totalValue: number, affectedCount: number }}
 */
export function runSensitivityAnalysis(positions, sector, shockPct) {
  const safePositions = Array.isArray(positions) ? positions : [];
  const totalValue = safePositions.reduce(
    (s, p) => s + (Number.isFinite(p?.marketValue) ? p.marketValue : 0),
    0,
  );
  const affected = safePositions.filter((p) => p?.sector === sector);
  const sectorValue = affected.reduce(
    (s, p) => s + (Number.isFinite(p?.marketValue) ? p.marketValue : 0),
    0,
  );
  const deltaUsd = sectorValue * (Number(shockPct) / 100);
  const deltaPct = totalValue > 0 ? (deltaUsd / totalValue) * 100 : 0;

  return {
    deltaUsd,
    deltaPct,
    sectorValue,
    totalValue,
    affectedCount: affected.length,
  };
}

/**
 * Per-scenario sector betas (loss factors). A value of -0.4 means a position
 * in that sector loses ~40% of its value in that scenario. Positions in
 * sectors not listed use the scenario's `_default` factor.
 *
 * Numbers are order-of-magnitude estimates drawn from well-known peak-to-
 * trough draws; refine with proper historical returns when available.
 */
const SCENARIO_BETAS = {
  '2008': {
    label: '2008 Financial Crisis',
    windowLabel: 'Oct 2007 – Mar 2009',
    _default: -0.37,
    Financials: -0.62,
    'Real Estate': -0.55,
    'Consumer Discretionary': -0.45,
    Industrials: -0.42,
    Technology: -0.38,
    Materials: -0.40,
    Energy: -0.40,
    'Health Care': -0.20,
    'Consumer Staples': -0.15,
    Utilities: -0.22,
    'Communication Services': -0.35,
  },
  covid: {
    label: '2020 COVID Crash',
    windowLabel: 'Feb 19 – Mar 23, 2020',
    _default: -0.30,
    Energy: -0.55,
    Financials: -0.40,
    'Real Estate': -0.38,
    Industrials: -0.34,
    'Consumer Discretionary': -0.30,
    Materials: -0.32,
    Technology: -0.20,
    'Communication Services': -0.22,
    'Consumer Staples': -0.14,
    Utilities: -0.26,
    'Health Care': -0.18,
  },
  dotcom: {
    label: '2000 Dot-Com Bust',
    windowLabel: 'Mar 2000 – Oct 2002',
    _default: -0.25,
    Technology: -0.78,
    'Communication Services': -0.55,
    'Consumer Discretionary': -0.30,
    Financials: -0.25,
    Industrials: -0.20,
    'Health Care': -0.10,
    'Consumer Staples': +0.05,
    Utilities: -0.15,
    Energy: +0.10,
    Materials: -0.15,
    'Real Estate': +0.05,
  },
  stagflation: {
    label: '1970s Stagflation',
    windowLabel: '1973 – 1982',
    _default: -0.15,
    Technology: -0.30,
    'Consumer Discretionary': -0.25,
    Financials: -0.20,
    'Consumer Staples': -0.10,
    Industrials: -0.10,
    Energy: +0.40,
    Materials: +0.22,
    'Real Estate': -0.05,
    Utilities: -0.12,
    'Health Care': -0.05,
    'Communication Services': -0.15,
  },
};

export const SCENARIOS = Object.entries(SCENARIO_BETAS).map(([id, v]) => ({
  id,
  label: v.label,
  windowLabel: v.windowLabel,
}));

/**
 * Scenario analysis — apply a per-sector shock table to every position.
 *
 * @param {Array<{ sector: string, marketValue: number, symbol?: string }>} positions
 * @param {string} scenarioId
 * @returns {{ deltaUsd: number, deltaPct: number, totalValue: number, breakdown: Array<{ symbol: string|null, sector: string, deltaUsd: number, beta: number }>, windowLabel: string|null }}
 */
export function runScenarioAnalysis(positions, scenarioId) {
  const scenario = SCENARIO_BETAS[scenarioId];
  const safePositions = Array.isArray(positions) ? positions : [];
  const totalValue = safePositions.reduce(
    (s, p) => s + (Number.isFinite(p?.marketValue) ? p.marketValue : 0),
    0,
  );

  if (!scenario) {
    return { deltaUsd: 0, deltaPct: 0, totalValue, breakdown: [], windowLabel: null };
  }

  let deltaUsd = 0;
  const breakdown = [];
  for (const pos of safePositions) {
    const mv = Number.isFinite(pos?.marketValue) ? pos.marketValue : 0;
    const sector = pos?.sector || 'Unclassified';
    const beta = Object.prototype.hasOwnProperty.call(scenario, sector)
      ? scenario[sector]
      : scenario._default;
    const rowDelta = mv * beta;
    deltaUsd += rowDelta;
    breakdown.push({
      symbol: pos?.symbol ?? null,
      sector,
      deltaUsd: rowDelta,
      beta,
    });
  }

  const deltaPct = totalValue > 0 ? (deltaUsd / totalValue) * 100 : 0;
  breakdown.sort((a, b) => a.deltaUsd - b.deltaUsd);

  return {
    deltaUsd,
    deltaPct,
    totalValue,
    breakdown,
    windowLabel: scenario.windowLabel,
  };
}

/**
 * Given the user's portfolio, compute the coarse bucket allocation used when
 * comparing against the All Weather target.
 *
 * We only classify equities (everything with a non-null `sector`) as
 * `equities`. If a richer position shape ever arrives (bond funds, gold ETFs,
 * broad commodities ETFs), extend this with explicit ticker/asset-type
 * mappings before landing in production.
 */
export function computeAllocationBuckets(positions) {
  const safePositions = Array.isArray(positions) ? positions : [];
  const totals = {
    equities: 0,
    bonds_long: 0,
    bonds_mid: 0,
    commodities: 0,
    gold: 0,
    other: 0,
  };
  let grand = 0;
  for (const p of safePositions) {
    const mv = Number.isFinite(p?.marketValue) ? p.marketValue : 0;
    grand += mv;
    if (p?.sector) totals.equities += mv;
    else totals.other += mv;
  }
  if (grand <= 0) {
    return ALL_WEATHER_TARGET.map((t) => ({ ...t, current: 0 }));
  }
  return ALL_WEATHER_TARGET.map((t) => ({
    ...t,
    current: (totals[t.bucket] || 0) / grand,
  }));
}

/**
 * Simple USD formatter.
 */
export function formatUsd(value) {
  const v = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(v);
  const sign = v < 0 ? '-$' : '$';
  return `${sign}${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
