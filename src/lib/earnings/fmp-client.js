const FMP_BASE = 'https://financialmodelingprep.com/stable';
const API_KEY = process.env.FMP_API_KEY;

/** Minimum transcript length (chars) — below this FMP often returns stubs or bad payloads */
const MIN_TRANSCRIPT_CHARS = 500;

/**
 * @typedef {object} RawTranscript
 * @property {string} symbol
 * @property {string} [period]
 * @property {number} year
 * @property {string} [date]
 * @property {string} content
 */

/**
 * @typedef {{ transcript?: RawTranscript; accessDenied?: boolean; httpStatus?: number; miss?: boolean }} TranscriptFetchResult
 */

/**
 * @param {string} symbol
 * @param {number} year
 * @param {number} quarter
 * @returns {Promise<TranscriptFetchResult>}
 */
async function fetchTranscriptInner(symbol, year, quarter) {
  if (!API_KEY) {
    console.warn('[fmp transcript] FMP_API_KEY missing');
    return { miss: true };
  }
  const url = `${FMP_BASE}/earning-call-transcript?symbol=${encodeURIComponent(symbol)}&year=${year}&quarter=${quarter}&apikey=${encodeURIComponent(API_KEY)}`;
  try {
    // Do not cache: 402/403 and plan upgrades must be visible immediately; Next fetch cache can hold bad responses.
    const res = await fetch(url, { cache: 'no-store' });

    if (res.status === 402 || res.status === 403) {
      console.warn(`[fmp transcript] ${symbol} Q${quarter} ${year}: HTTP ${res.status} (plan / access)`);
      return { accessDenied: true, httpStatus: res.status };
    }

    if (!res.ok) {
      console.warn(`[fmp transcript] ${symbol} Q${quarter} ${year}: HTTP ${res.status}`);
      return { miss: true, httpStatus: res.status };
    }

    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      console.warn(`[fmp transcript] ${symbol} Q${quarter} ${year}: non-JSON body`);
      return { miss: true };
    }

    if (!Array.isArray(data) || data.length === 0) {
      return { miss: true };
    }

    const first = data[0];
    if (!first || typeof first.content !== 'string' || first.content.length < MIN_TRANSCRIPT_CHARS) {
      return { miss: true };
    }

    return {
      transcript: /** @type {RawTranscript} */ ({
        symbol: first.symbol ?? symbol,
        period: first.period,
        year: typeof first.year === 'number' ? first.year : year,
        date: first.date,
        content: first.content,
      }),
    };
  } catch (err) {
    console.error(`[fmp transcript] ${symbol} Q${quarter} ${year} failed:`, err);
    return { miss: true };
  }
}

/**
 * @param {string} symbol
 * @param {number} year
 * @param {number} quarter
 * @returns {Promise<RawTranscript | null>}
 */
export async function fetchTranscript(symbol, year, quarter) {
  const r = await fetchTranscriptInner(symbol, year, quarter);
  return r.transcript ?? null;
}

/**
 * Walk backward through calendar quarters until we collect n usable transcripts or hit limits.
 *
 * @param {string} symbol
 * @param {number} [n]
 * @returns {Promise<{ transcripts: RawTranscript[]; fmpAccessDenied: boolean }>}
 */
export async function fetchLastNTranscripts(symbol, n = 4) {
  const now = new Date();
  let year = now.getFullYear();
  let quarter = Math.floor(now.getMonth() / 3) + 1;

  // Start one calendar quarter back: the current quarter's call is often not published yet.
  quarter -= 1;
  if (quarter === 0) {
    quarter = 4;
    year -= 1;
  }

  /** @type {RawTranscript[]} */
  const transcripts = [];
  let fmpAccessDenied = false;
  const maxAttempts = Math.max(n * 3, 12);

  for (let i = 0; i < maxAttempts && transcripts.length < n; i++) {
    let r;
    try {
      r = await fetchTranscriptInner(symbol, year, quarter);
    } catch (err) {
      console.warn(`[fetchLastNTranscripts] ${symbol} Q${quarter} ${year}:`, err?.message || err);
      r = { miss: true };
    }
    if (r.accessDenied) fmpAccessDenied = true;
    else if (r.transcript) transcripts.push(r.transcript);

    quarter -= 1;
    if (quarter === 0) {
      quarter = 4;
      year -= 1;
    }
    if (year < 2010) break;
  }

  return { transcripts, fmpAccessDenied };
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
    let data;
    try {
      data = await res.json();
    } catch {
      return [];
    }
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
