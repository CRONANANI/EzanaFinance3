const FMP_BASE = 'https://financialmodelingprep.com/stable';
const API_KEY = process.env.FMP_API_KEY;

/**
 * @typedef {object} RawTranscript
 * @property {string} symbol
 * @property {string} period
 * @property {number} year
 * @property {string} date
 * @property {string} content
 */

/**
 * @param {string} symbol
 * @param {number} year
 * @param {number} quarter
 * @returns {Promise<RawTranscript | null>}
 */
export async function fetchTranscript(symbol, year, quarter) {
  if (!API_KEY) {
    console.warn('[fmp transcript] FMP_API_KEY missing');
    return null;
  }
  const url = `${FMP_BASE}/earning-call-transcript?symbol=${encodeURIComponent(symbol)}&year=${year}&quarter=${quarter}&apikey=${encodeURIComponent(API_KEY)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 * 7 } });
    if (!res.ok) {
      console.warn(`[fmp transcript] ${symbol} Q${quarter} ${year}: ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return /** @type {RawTranscript} */ (data[0]);
  } catch (err) {
    console.error(`[fmp transcript] ${symbol} failed:`, err);
    return null;
  }
}

/**
 * @param {string} symbol
 * @param {number} [n]
 * @returns {Promise<RawTranscript[]>}
 */
export async function fetchLastNTranscripts(symbol, n = 4) {
  const now = new Date();
  let year = now.getFullYear();
  let quarter = Math.floor(now.getMonth() / 3) + 1;

  const attempts = [];
  for (let i = 0; i < n * 3; i++) {
    attempts.push({ year, quarter });
    quarter -= 1;
    if (quarter === 0) {
      quarter = 4;
      year -= 1;
    }
  }

  const rows = await Promise.all(
    attempts.map(({ year: y, quarter: q }) => fetchTranscript(symbol, y, q)),
  );

  const out = [];
  for (const t of rows) {
    if (t) out.push(t);
    if (out.length >= n) break;
  }
  return out;
}

/**
 * @typedef {object} EarningsRow
 * @property {string} symbol
 * @property {string} date
 * @property {number | null} epsActual
 * @property {number | null} epsEstimated
 * @property {number | null} revenueActual
 * @property {number | null} revenueEstimated
 */

/**
 * @param {string} symbol
 * @param {number} [limit]
 * @returns {Promise<EarningsRow[]>}
 */
export async function fetchEarningsHistory(symbol, limit = 12) {
  if (!API_KEY) return [];
  const url = `${FMP_BASE}/earnings-surprises?symbol=${encodeURIComponent(symbol)}&limit=${limit}&apikey=${encodeURIComponent(API_KEY)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((r) => ({
      symbol: r.symbol,
      date: r.date,
      epsActual: r.actualEarningResult ?? null,
      epsEstimated: r.estimatedEarning ?? null,
      revenueActual: r.revenue ?? null,
      revenueEstimated: r.revenueEstimated ?? null,
    }));
  } catch {
    return [];
  }
}
