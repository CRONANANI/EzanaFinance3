const FMP_BASE = 'https://financialmodelingprep.com/stable';
const AV_BASE = 'https://www.alphavantage.co/query';
const API_KEY = process.env.FMP_API_KEY;

/** Minimum transcript length (chars) — below this FMP often returns stubs or bad payloads */
const MIN_TRANSCRIPT_CHARS = 500;

/**
 * Try fetching a transcript from Alpha Vantage EARNINGS_CALL_TRANSCRIPT.
 * AV uses "YYYYQN" format for the quarter parameter (e.g., "2024Q1").
 *
 * @param {string} symbol
 * @param {number} year
 * @param {number} quarter
 * @returns {Promise<RawTranscript | null>}
 */
async function fetchAvTranscript(symbol, year, quarter) {
  const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY || process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY;
  if (!AV_KEY) return null;

  const quarterParam = `${year}Q${quarter}`;
  const url = `${AV_BASE}?function=EARNINGS_CALL_TRANSCRIPT&symbol=${encodeURIComponent(symbol)}&quarter=${encodeURIComponent(quarterParam)}&apikey=${AV_KEY}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;

    const data = await res.json();

    if (data.Note || data.Information || data['Error Message']) return null;

    const transcript = data?.transcript;
    if (!transcript || typeof transcript !== 'string' || transcript.length < MIN_TRANSCRIPT_CHARS) {
      return null;
    }

    return {
      symbol: data.symbol || symbol,
      period: `Q${quarter}`,
      year: data.year || year,
      date: data.date || null,
      content: transcript,
      _source: 'alpha_vantage',
    };
  } catch (err) {
    console.warn(`[av transcript] ${symbol} Q${quarter} ${year}:`, err?.message);
    return null;
  }
}

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
 * Try Alpha Vantage first for the transcript, then fall back to FMP.
 *
 * @param {string} symbol
 * @param {number} year
 * @param {number} quarter
 * @returns {Promise<TranscriptFetchResult>}
 */
async function fetchTranscriptInner(symbol, year, quarter) {
  const avTranscript = await fetchAvTranscript(symbol, year, quarter);
  if (avTranscript) {
    console.log(`[transcript] ${symbol} Q${quarter} ${year}: found via Alpha Vantage`);
    return { transcript: avTranscript };
  }

  if (!API_KEY) {
    console.warn('[fmp transcript] FMP_API_KEY missing');
    return { miss: true };
  }
  const url = `${FMP_BASE}/earning-call-transcript?symbol=${encodeURIComponent(symbol)}&year=${year}&quarter=${quarter}&apikey=${encodeURIComponent(API_KEY)}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });

    if (res.status === 402 || res.status === 403) {
      console.warn(
        `[fmp transcript] ${symbol} Q${quarter} ${year}: HTTP ${res.status} (plan / access)`,
      );
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
    if (
      !first ||
      typeof first.content !== 'string' ||
      first.content.length < MIN_TRANSCRIPT_CHARS
    ) {
      return { miss: true };
    }

    return {
      transcript: /** @type {RawTranscript} */ ({
        symbol: first.symbol ?? symbol,
        period: first.period,
        year: typeof first.year === 'number' ? first.year : year,
        date: first.date,
        content: first.content,
        _source: 'fmp',
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
