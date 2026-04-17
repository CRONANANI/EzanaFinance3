/**
 * Server-only client for the four FMP calendar endpoints powering the Home
 * page "Upcoming Events & Alerts" card.
 *
 *   - /earnings-calendar
 *   - /dividends-calendar
 *   - /ipos-calendar
 *   - /economic-calendar
 *
 * All four accept a `from`/`to` date range (max 90 days) and return JSON
 * arrays. We compute the window at request time — today's date through the
 * last day of the current month — so builds never cache a stale date like
 * April 17 into the HTML shell.
 */

const FMP_STABLE = 'https://financialmodelingprep.com/stable';

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
  const to =
    daysLeft < 3
      ? new Date(Date.UTC(y, m, now.getUTCDate() + 7))
      : eom;

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
 * @returns {Promise<Array<{
 *   symbol: string, date: string,
 *   epsEstimated: number|null, epsActual: number|null,
 *   revenueEstimated: number|null, revenueActual: number|null,
 * }>>}
 */
export async function getEarningsEvents() {
  return fetchJson(buildUrl('/earnings-calendar'));
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

/** Which 4 endpoints this client wraps — used by the aggregator route. */
export const FEED_KEYS = ['earnings', 'dividends', 'ipos', 'economic'];
