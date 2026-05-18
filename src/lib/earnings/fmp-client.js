const FMP_BASE = 'https://financialmodelingprep.com/stable';
const AV_BASE = 'https://www.alphavantage.co/query';

/** Minimum transcript length (chars) — below this FMP often returns stubs or bad payloads */
const MIN_TRANSCRIPT_CHARS = 500;

/** Read FMP key at request time, not module load time (Vercel bakes module-level reads at build). */
function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

/** Read AV key at request time. */
function getAvKey() {
  return process.env.ALPHA_VANTAGE_API_KEY || process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || '';
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
 * Try fetching a transcript from Alpha Vantage EARNINGS_CALL_TRANSCRIPT.
 * AV uses "YYYYQN" format for the quarter parameter (e.g., "2024Q1").
 *
 * The AV response may vary in shape — handle multiple possibilities:
 *   - { transcript: "full text..." } — single string
 *   - { transcript: [{ content: "..." }] } — array of sections
 *   - { content: "full text..." } — alternative flat shape
 *
 * @param {string} symbol
 * @param {number} year
 * @param {number} quarter
 * @returns {Promise<RawTranscript | null>}
 */
async function fetchAvTranscript(symbol, year, quarter) {
  const AV_KEY = getAvKey();
  if (!AV_KEY) return null;

  const quarterParam = `${year}Q${quarter}`;
  const url = `${AV_BASE}?function=EARNINGS_CALL_TRANSCRIPT&symbol=${encodeURIComponent(symbol)}&quarter=${encodeURIComponent(quarterParam)}&apikey=${AV_KEY}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[av transcript] ${symbol} Q${quarter} ${year}: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();

    // Rate limit / error messages
    if (data?.Note || data?.Information || data?.['Error Message']) {
      console.warn(
        `[av transcript] ${symbol} Q${quarter} ${year}: AV error:`,
        data.Note || data.Information || data['Error Message'],
      );
      return null;
    }

    console.log(`[av transcript] ${symbol} Q${quarter} ${year}: response keys:`, Object.keys(data));

    /** @type {string | null} */
    let transcriptText = null;

    if (typeof data.transcript === 'string' && data.transcript.length >= MIN_TRANSCRIPT_CHARS) {
      transcriptText = data.transcript;
    } else if (Array.isArray(data.transcript) && data.transcript.length > 0) {
      const joined = data.transcript
        .map((section) => {
          if (typeof section === 'string') return section;
          if (typeof section?.content === 'string') return section.content;
          if (typeof section?.text === 'string') return section.text;
          return '';
        })
        .join('\n\n');
      if (joined.length >= MIN_TRANSCRIPT_CHARS) {
        transcriptText = joined;
      }
    } else if (typeof data.content === 'string' && data.content.length >= MIN_TRANSCRIPT_CHARS) {
      transcriptText = data.content;
    } else if (typeof data.body === 'string' && data.body.length >= MIN_TRANSCRIPT_CHARS) {
      transcriptText = data.body;
    }

    if (!transcriptText) {
      const preview = JSON.stringify(data).slice(0, 300);
      console.warn(
        `[av transcript] ${symbol} Q${quarter} ${year}: no usable transcript found in response. Preview: ${preview}`,
      );
      return null;
    }

    console.log(
      `[av transcript] ${symbol} Q${quarter} ${year}: found ${transcriptText.length} chars via Alpha Vantage`,
    );

    return {
      symbol: data.symbol || symbol,
      period: `Q${quarter}`,
      year: data.year || year,
      date: data.date || null,
      content: transcriptText,
      _source: 'alpha_vantage',
    };
  } catch (err) {
    console.warn(`[av transcript] ${symbol} Q${quarter} ${year} error:`, err?.message);
    return null;
  }
}

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
    return { transcript: avTranscript };
  }

  const fmpKey = getFmpKey();
  if (!fmpKey) {
    console.warn(
      `[fmp transcript] ${symbol} Q${quarter} ${year}: FMP_API_KEY missing, skipping FMP`,
    );
    return { miss: true };
  }

  const url = `${FMP_BASE}/earning-call-transcript?symbol=${encodeURIComponent(symbol)}&year=${year}&quarter=${quarter}&apikey=${encodeURIComponent(fmpKey)}`;
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
 * @returns {Promise<{ transcripts: RawTranscript[]; fmpAccessDenied: boolean; avKeyConfigured: boolean }>}
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
  const avKeyConfigured = !!getAvKey();
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

  return { transcripts, fmpAccessDenied, avKeyConfigured };
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
  const fmpKey = getFmpKey();
  if (!fmpKey) return [];
  const url = `${FMP_BASE}/earnings-surprises?symbol=${encodeURIComponent(symbol)}&limit=${limit}&apikey=${encodeURIComponent(fmpKey)}`;
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
