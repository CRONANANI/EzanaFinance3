/**
 * Server-only client for calendar feeds powering the Home page
 * "Upcoming Events & Alerts" card.
 *
 * Earnings: Alpha Vantage `EARNINGS_CALENDAR` (CSV) first, FMP
 * `/earnings-calendar` as fallback.
 *
 * Other feeds (dividends, IPOs, economic): FMP stable JSON with `from`/`to`.
 */

import { getAlphaVantageApiKey } from '@/lib/alpha-vantage';

const FMP_STABLE = 'https://financialmodelingprep.com/stable';
const AV_BASE = 'https://www.alphavantage.co/query';

/** Prefer the server-side key; accept the NEXT_PUBLIC_ alias for back-compat. */
export function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

/**
 * Computes the rolling window used by every calendar endpoint:
 *   - `from`: today (UTC, YYYY-MM-DD)
 *   - `to`:   last day of the current month (UTC, YYYY-MM-DD)
 *
 * If fewer than 3 days remain in the month, extends `to` to today + 7 days
 * so the card isn't nearly empty at month-end.
 *
 * @returns {{ from: string, to: string }}
 */
export function todayAndEndOfMonth() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const eom = new Date(Date.UTC(y, m + 1, 0));

  const msPerDay = 86_400_000;
  const daysLeft = Math.ceil((eom.getTime() - now.getTime()) / msPerDay);
  const to = daysLeft < 3 ? new Date(Date.UTC(y, m, now.getUTCDate() + 7)) : eom;

  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(now), to: fmt(to) };
}

/** Internal: fetch + decode with a clear error surface. */
async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`FMP ${res.status}${body ? `: ${body.slice(0, 160)}` : ''}`);
  }
  return res.json();
}

/** Build a URL for a stable endpoint with `from`/`to` and the server key. */
function buildUrl(path, extra = {}) {
  const key = encodeURIComponent(getFmpKey());
  const { from, to } = todayAndEndOfMonth();
  const params = new URLSearchParams({ from, to, apikey: key, ...extra });
  return `${FMP_STABLE}${path}?${params.toString()}`;
}

/**
 * @param {string[]} [symbols] — optional tickers (AV fetches per-symbol when set)
 * @returns {Promise<Array<{
 *   symbol: string, date: string,
 *   epsEstimated: number|null, epsActual: number|null,
 *   revenueEstimated: number|null, revenueActual: number|null,
 * }>>}
 */
export async function getEarningsEvents(symbols = []) {
  const AV_KEY = getAlphaVantageApiKey();

  if (AV_KEY) {
    try {
      const results = await fetchAvEarningsCalendar(AV_KEY, symbols);
      if (results.length > 0) return results;
    } catch (err) {
      console.warn(
        '[upcoming-events] AV earnings calendar failed, falling back to FMP:',
        err?.message,
      );
    }
  }

  try {
    return await fetchJson(buildUrl('/earnings-calendar'));
  } catch (err) {
    console.warn('[upcoming-events] FMP earnings calendar also failed:', err?.message);
    return [];
  }
}

/**
 * @param {string} AV_KEY
 * @param {string[]} [symbols]
 */
async function fetchAvEarningsCalendar(AV_KEY, symbols = []) {
  const allResults = [];
  const syms = [
    ...new Set(
      (symbols || [])
        .map((s) =>
          String(s || '')
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean),
    ),
  ];

  if (syms.length === 0) {
    const url = `${AV_BASE}?function=EARNINGS_CALENDAR&horizon=3month&apikey=${encodeURIComponent(AV_KEY)}`;
    const parsed = await fetchAndParseAvCsv(url);
    allResults.push(...parsed);
  } else {
    const batches = [];
    for (let i = 0; i < syms.length; i += 10) {
      batches.push(syms.slice(i, i + 10));
    }

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map((sym) => {
          const url = `${AV_BASE}?function=EARNINGS_CALENDAR&symbol=${encodeURIComponent(sym)}&horizon=12month&apikey=${encodeURIComponent(AV_KEY)}`;
          return fetchAndParseAvCsv(url);
        }),
      );
      for (const r of batchResults) {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) {
          allResults.push(...r.value);
        }
      }
    }
  }

  return allResults;
}

/** Split one CSV row, respecting double-quoted fields (commas inside names). */
function splitCsvLine(line) {
  const cols = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      cols.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  cols.push(cur.trim());
  return cols;
}

/**
 * Fetch Alpha Vantage EARNINGS_CALENDAR CSV and map to the FMP-like row shape.
 * Columns: symbol, name, reportDate, fiscalDateEnding, estimate, currency
 */
async function fetchAndParseAvCsv(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return [];

  const text = await res.text();
  if (!text || text.trim().startsWith('{')) return [];
  const t = text.trim();
  if (t.includes('Thank you for using Alpha Vantage') || /\b(Note|Information)\b/.test(t)) {
    return [];
  }

  const lines = t.split(/\r?\n/).filter((ln) => ln.length > 0);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const symbolIdx = headers.indexOf('symbol');
  const dateIdx = headers.indexOf('reportDate');
  const estimateIdx = headers.indexOf('estimate');
  const nameIdx = headers.indexOf('name');

  if (symbolIdx === -1 || dateIdx === -1) return [];

  const events = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]);
    const symbol = cols[symbolIdx];
    const date = cols[dateIdx];
    if (!symbol || !date) continue;

    const estimateRaw = estimateIdx >= 0 ? cols[estimateIdx] : '';
    const estimate =
      estimateRaw && estimateRaw !== 'None' && estimateRaw !== '' && estimateRaw !== '-'
        ? parseFloat(estimateRaw)
        : null;

    events.push({
      symbol: symbol.trim(),
      name: nameIdx >= 0 ? cols[nameIdx] : symbol,
      date,
      epsEstimated: Number.isFinite(estimate) ? estimate : null,
      epsActual: null,
      revenueEstimated: null,
      revenueActual: null,
      _source: 'alpha_vantage',
    });
  }

  return events;
}

/**
 * @returns {Promise<Array<{
 *   symbol: string, date: string, dividend: number,
 *   yield: number, frequency: string,
 *   recordDate?: string, paymentDate?: string, declarationDate?: string,
 * }>>}
 */
export async function getDividendEvents() {
  return fetchJson(buildUrl('/dividends-calendar'));
}

/**
 * @returns {Promise<Array<{
 *   symbol: string, date: string, company: string,
 *   exchange: string, actions?: string,
 *   priceRange?: string|null, shares?: number|null, marketCap?: number|null,
 * }>>}
 */
export async function getIpoEvents() {
  return fetchJson(buildUrl('/ipos-calendar'));
}

/**
 * @param {string} [country]
 * @returns {Promise<Array<{
 *   date: string, country: string, event: string, currency: string,
 *   previous: number|null, estimate: number|null, actual: number|null,
 *   impact: 'Low'|'Medium'|'High'|string,
 * }>>}
 */
export async function getEconomicEvents(country = 'US') {
  return fetchJson(buildUrl('/economic-calendar', { country }));
}

/**
 * Fetch the latest congressional trades (merged House + Senate) from FMP.
 * Mirrors the shape /api/fmp/congress-latest uses so downstream filtering
 * by followed politicians is straightforward.
 *
 * @returns {Promise<Array<{
 *   symbol: string, transactionDate?: string, disclosureDate?: string,
 *   type?: string, transactionType?: string,
 *   firstName?: string, lastName?: string,
 *   representative?: string, senator?: string,
 *   amountLow?: number|string, amountHigh?: number|string, amount?: string,
 *   chamber: 'House'|'Senate',
 * }>>}
 */
export async function getCongressTrades() {
  const key = encodeURIComponent(getFmpKey());
  if (!key) return [];
  const fetchOne = async (endpoint, chamber) => {
    try {
      const url = `${FMP_STABLE}/${endpoint}?page=0&apikey=${key}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((t) => ({ ...t, chamber }));
    } catch {
      return [];
    }
  };
  const [house, senate] = await Promise.all([
    fetchOne('house-trades', 'House'),
    fetchOne('senate-trades', 'Senate'),
  ]);
  return [...house, ...senate];
}

/**
 * Placeholder for a future crypto-events feed. The server route already
 * wires filtering against the user's followed crypto symbols — once a
 * real data source is connected, swap this stub for the live fetch.
 *
 * Expected row shape (when implemented):
 *   { symbol: 'BTC', date: '2026-04-20', title: 'Halving', subtitle?: string,
 *     kind: 'halving'|'upgrade'|'listing'|'unlock'|... }
 *
 * TODO: wire to a real provider (CoinMarketCap events API, Messari, etc.).
 */
export async function getCryptoEvents() {
  return [];
}

/**
 * Placeholder for a future commodity-events feed (WASDE reports, OPEC
 * meetings, inventory releases, etc.). See getCryptoEvents() for the
 * expected shape once implemented.
 *
 * TODO: wire to an economic data provider (FRED, USDA, EIA).
 */
export async function getCommodityEvents() {
  return [];
}

/** Which endpoints this client wraps — used by the aggregator route. */
export const FEED_KEYS = [
  'earnings',
  'dividends',
  'ipos',
  'economic',
  'inside-the-capitol',
  'crypto',
  'commodity',
];
