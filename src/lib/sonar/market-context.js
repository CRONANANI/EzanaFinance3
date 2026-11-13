// src/lib/sonar/market-context.js
// Market Context card (Sonar workspace, Nov 2026): the maths behind "subject
// against a benchmark". Pure: plain arrays in, plain objects out, tested in
// scripts/check-sonar-workspace.mjs. Every number shown on the card comes
// from real daily closes; nothing here invents, smooths or pads a series.

/** Range tabs, in display order. `days` is calendar days back from the last close. */
export const MARKET_RANGES = [
  { key: '1D', label: '1D', days: 1, intraday: true },
  { key: '5D', label: '5D', days: 7 },
  { key: '1M', label: '1M', days: 31 },
  { key: '3M', label: '3M', days: 92 },
  { key: '6M', label: '6M', days: 183 },
  { key: 'YTD', label: 'YTD', days: null },
  { key: '1Y', label: '1Y', days: 366 },
];
export const DEFAULT_RANGE = '3M';

/* A benchmark that helps read the subject: its sector fund when the sector is
   known, else the broad US market. Symbols are liquid US-listed funds. */
const SECTOR_BENCHMARKS = [
  [/semiconductor/i, 'SOXX', 'Semiconductors'],
  [/technology|software|information/i, 'XLK', 'Technology'],
  [/financ|bank|insur/i, 'XLF', 'Financials'],
  [/health|pharma|biotech/i, 'XLV', 'Health care'],
  [/energy|oil|gas/i, 'XLE', 'Energy'],
  [/industrial|aerospace|defen[cs]e/i, 'XLI', 'Industrials'],
  [/consumer (cyclical|discretionary)|retail|auto/i, 'XLY', 'Consumer discretionary'],
  [/consumer (defensive|staples)/i, 'XLP', 'Consumer staples'],
  [/utilit/i, 'XLU', 'Utilities'],
  [/real estate|reit/i, 'XLRE', 'Real estate'],
  [/material|mining|chemical/i, 'XLB', 'Materials'],
  [/communication|media|telecom/i, 'XLC', 'Communication services'],
];
const BROAD = { symbol: 'SPY', label: 'S&P 500' };

/**
 * The benchmark for a subject. Industry is matched before sector, so a chip
 * maker reads against semiconductors, not all of technology.
 * @returns {{ symbol: string, label: string }}
 */
export function benchmarkFor({ ticker = '', sector = '', industry = '' } = {}) {
  const self = String(ticker).toUpperCase();
  for (const text of [industry, sector]) {
    if (!text) continue;
    const hit = SECTOR_BENCHMARKS.find(([re]) => re.test(text));
    if (hit && hit[1] !== self) return { symbol: hit[1], label: hit[2] };
  }
  return self === BROAD.symbol ? { symbol: 'QQQ', label: 'Nasdaq 100' } : BROAD;
}

const isoDay = (d) => new Date(d).toISOString().slice(0, 10);

/** First date (YYYY-MM-DD) a range covers, counted back from `lastDate`. */
export function rangeStart(rangeKey, lastDate) {
  const range = MARKET_RANGES.find((r) => r.key === rangeKey) || MARKET_RANGES[3];
  const last = new Date(`${lastDate}T00:00:00Z`);
  if (range.key === 'YTD') return `${last.getUTCFullYear()}-01-01`;
  return isoDay(last.getTime() - range.days * 86400000);
}

const clean = (rows) =>
  (rows || [])
    .filter((r) => r && r.date && Number.isFinite(Number(r.close)) && Number(r.close) > 0)
    .map((r) => ({ date: String(r.date).slice(0, 10), close: Number(r.close) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

/**
 * Two daily close series on their shared trading days inside a range, each
 * rebased to percent change from the range's first shared close.
 *
 * @param {{date:string, close:number}[]} subject
 * @param {{date:string, close:number}[]} benchmark may be empty: the subject is then shown alone
 * @param {string} rangeKey one of MARKET_RANGES (daily ranges only)
 * @returns {null | { range: string, from: string, to: string, points: number,
 *   series: { date: string, subject: number, benchmark: number|null }[],
 *   subjectReturn: number, benchmarkReturn: number|null, relative: number|null,
 *   droppedDays: number }} returns are percentages (18.9 = +18.9%)
 */
export function compareSeries(subject, benchmark, rangeKey = DEFAULT_RANGE) {
  const s = clean(subject);
  if (s.length < 2) return null;
  const b = clean(benchmark);
  const to = s[s.length - 1].date;
  const from = rangeStart(rangeKey, to);
  const bMap = new Map(b.map((r) => [r.date, r.close]));
  const inRange = s.filter((r) => r.date >= from);
  const paired = b.length ? inRange.filter((r) => bMap.has(r.date)) : inRange;
  if (paired.length < 2) return null;
  const s0 = paired[0].close;
  const b0 = b.length ? bMap.get(paired[0].date) : null;
  const series = paired.map((r) => ({
    date: r.date,
    subject: (r.close / s0 - 1) * 100,
    benchmark: b0 ? (bMap.get(r.date) / b0 - 1) * 100 : null,
  }));
  const last = series[series.length - 1];
  return {
    range: rangeKey,
    from: paired[0].date,
    to: last.date,
    points: series.length,
    series,
    subjectReturn: last.subject,
    benchmarkReturn: last.benchmark,
    relative: last.benchmark == null ? null : last.subject - last.benchmark,
    /* Days the subject traded and the benchmark did not (different sessions). */
    droppedDays: inRange.length - paired.length,
  };
}

/** Which daily ranges the data can honestly draw (at least two shared closes). */
export function availableRanges(subject, benchmark) {
  return MARKET_RANGES.filter((r) => !r.intraday)
    .filter((r) => compareSeries(subject, benchmark, r.key))
    .map((r) => r.key);
}

/** "+18.9%" / "-4.2%" / "0.0%", with a real minus sign for display. */
export function signedPct(v, digits = 1) {
  if (!Number.isFinite(v)) return 'n/a';
  const abs = Math.abs(v).toFixed(digits);
  if (Number(abs) === 0) return `${abs}%`;
  return `${v > 0 ? '+' : '−'}${abs}%`;
}

/** "+7.5 pp" for a difference between two percentage returns. */
export function signedPoints(v, digits = 1) {
  if (!Number.isFinite(v)) return 'n/a';
  const abs = Math.abs(v).toFixed(digits);
  if (Number(abs) === 0) return `${abs} pp`;
  return `${v > 0 ? '+' : '−'}${abs} pp`;
}

/** The chart's text alternative, from the same numbers the card shows. */
export function chartSummary(cmp, subjectLabel, benchmarkLabel) {
  if (!cmp) return 'Market data is not available for the selected period.';
  const head = `${subjectLabel} ${signedPct(cmp.subjectReturn)} from ${cmp.from} to ${cmp.to}`;
  if (cmp.benchmarkReturn == null) return `${head}.`;
  return `${head}; ${benchmarkLabel} ${signedPct(cmp.benchmarkReturn)}; difference ${signedPoints(cmp.relative)}.`;
}

/** A symbol the market-context route accepts: "NVDA", "BRK.B", "SOXX". */
export const MARKET_SYMBOL_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;
export const isMarketSymbol = (s) => typeof s === 'string' && MARKET_SYMBOL_RE.test(s);
