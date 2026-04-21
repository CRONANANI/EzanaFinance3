/**
 * Thin FMP client for congressional-trade ingestion and historical price
 * lookups. Server-side only — every caller runs from `/api/cron/...` or the
 * background worker, never from the browser.
 *
 * The historical-price helpers automatically expand the lookup window when
 * the requested date lands on a weekend/holiday, because congressional
 * transaction dates are frequently non-trading days.
 */

const FMP_BASE = 'https://financialmodelingprep.com/stable';

function getApiKey() {
  const key = process.env.FMP_API_KEY;
  if (!key) {
    throw new Error('FMP_API_KEY is not configured');
  }
  return key;
}

/**
 * Fetch a page of chamber trades between two inclusive ISO dates.
 * FMP pagination returns up to 100 rows per page.
 *
 * @param {'senate' | 'house'} chamber
 * @param {string} fromDate — YYYY-MM-DD
 * @param {string} toDate — YYYY-MM-DD
 * @param {number} page
 * @returns {Promise<any[]>}
 */
export async function fetchChamberTrades(chamber, fromDate, toDate, page = 0) {
  const apiKey = getApiKey();
  const endpoint = chamber === 'senate' ? 'senate-trades' : 'house-trades';
  const url = `${FMP_BASE}/${endpoint}?from=${fromDate}&to=${toDate}&page=${page}&apikey=${apiKey}`;

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) {
    throw new Error(`FMP ${chamber} trades request failed: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch the closing price for `symbol` on `date` (YYYY-MM-DD). If the exact
 * date has no trading bar (weekend/holiday), expand the window ±5 days and
 * pick the closest available bar.
 *
 * @param {string} symbol
 * @param {string} date — YYYY-MM-DD
 * @returns {Promise<number | null>}
 */
export async function fetchHistoricalPriceOnDate(symbol, date) {
  if (!symbol || !date) return null;
  const apiKey = getApiKey();

  const url = `${FMP_BASE}/historical-price-eod/full?symbol=${encodeURIComponent(
    symbol
  )}&from=${date}&to=${date}&apikey=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 * 7 } });
    if (!res.ok) return null;
    const data = await res.json();
    const rows = Array.isArray(data) ? data : data?.historical ?? [];
    if (rows.length === 0) {
      return fetchNearestTradingDayPrice(symbol, date);
    }
    const px = Number(rows[0]?.close ?? rows[0]?.adjClose);
    return Number.isFinite(px) && px > 0 ? px : null;
  } catch {
    return null;
  }
}

/**
 * Expand the lookup window ±5 calendar days and pick the closest trading
 * day to the target. Used as the fallback when the requested date returns
 * an empty bar set.
 *
 * @param {string} symbol
 * @param {string} date
 * @returns {Promise<number | null>}
 */
export async function fetchNearestTradingDayPrice(symbol, date) {
  const apiKey = getApiKey();
  const target = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(+target)) return null;

  const from = new Date(target);
  from.setUTCDate(from.getUTCDate() - 5);
  const to = new Date(target);
  to.setUTCDate(to.getUTCDate() + 5);
  const fromIso = from.toISOString().slice(0, 10);
  const toIso = to.toISOString().slice(0, 10);

  const url = `${FMP_BASE}/historical-price-eod/full?symbol=${encodeURIComponent(
    symbol
  )}&from=${fromIso}&to=${toIso}&apikey=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 * 7 } });
    if (!res.ok) return null;
    const data = await res.json();
    const rows = Array.isArray(data) ? data : data?.historical ?? [];
    if (rows.length === 0) return null;
    rows.sort(
      (a, b) =>
        Math.abs(+new Date(a.date) - +target) -
        Math.abs(+new Date(b.date) - +target)
    );
    const px = Number(rows[0]?.close ?? rows[0]?.adjClose);
    return Number.isFinite(px) && px > 0 ? px : null;
  } catch {
    return null;
  }
}
