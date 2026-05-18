import { fetchAV, getAlphaVantageApiKey } from '@/lib/alpha-vantage';

const FMP_BASE = 'https://financialmodelingprep.com/stable';

const MIN_TRANSCRIPT_CHARS = 500;

function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

/**
 * Fetch a single earnings call transcript from Alpha Vantage.
 * Uses the shared fetchAV helper which handles rate limits and caching.
 */
async function fetchTranscript(symbol, year, quarter) {
  const quarterParam = `${year}Q${quarter}`;

  try {
    const data = await fetchAV(
      { function: 'EARNINGS_CALL_TRANSCRIPT', symbol, quarter: quarterParam },
      86400,
    );

    console.log(
      `[earnings/av] ${symbol} ${quarterParam}: response keys: ${Object.keys(data).join(', ')}`,
    );

    let text = null;

    if (typeof data.transcript === 'string' && data.transcript.length >= MIN_TRANSCRIPT_CHARS) {
      text = data.transcript;
    } else if (Array.isArray(data.transcript) && data.transcript.length > 0) {
      const joined = data.transcript
        .map((s) => (typeof s === 'string' ? s : s?.content || s?.text || ''))
        .join('\n\n');
      if (joined.length >= MIN_TRANSCRIPT_CHARS) text = joined;
    } else if (typeof data.content === 'string' && data.content.length >= MIN_TRANSCRIPT_CHARS) {
      text = data.content;
    } else if (typeof data.body === 'string' && data.body.length >= MIN_TRANSCRIPT_CHARS) {
      text = data.body;
    }

    if (!text) {
      const preview = JSON.stringify(data).slice(0, 200);
      console.warn(
        `[earnings/av] ${symbol} ${quarterParam}: no usable transcript. Preview: ${preview}`,
      );
      return null;
    }

    console.log(`[earnings/av] ${symbol} ${quarterParam}: found ${text.length} chars`);

    return {
      symbol: data.symbol || symbol,
      period: `Q${quarter}`,
      year: data.year || year,
      date: data.date || null,
      content: text,
    };
  } catch (err) {
    console.warn(`[earnings/av] ${symbol} ${quarterParam}: ${err?.message}`);
    return null;
  }
}

/**
 * Walk backward through calendar quarters, fetching transcripts from Alpha Vantage.
 */
export async function fetchLastNTranscripts(symbol, n = 4) {
  const avKey = getAlphaVantageApiKey();

  if (!avKey) {
    console.warn('[earnings] ALPHA_VANTAGE_API_KEY is not configured');
    return { transcripts: [] };
  }

  const now = new Date();
  let year = now.getFullYear();
  let quarter = Math.floor(now.getMonth() / 3) + 1;

  quarter -= 1;
  if (quarter === 0) {
    quarter = 4;
    year -= 1;
  }

  const transcripts = [];
  const maxAttempts = Math.max(n * 3, 12);

  for (let i = 0; i < maxAttempts && transcripts.length < n; i++) {
    const t = await fetchTranscript(symbol, year, quarter);
    if (t) transcripts.push(t);

    quarter -= 1;
    if (quarter === 0) {
      quarter = 4;
      year -= 1;
    }
    if (year < 2010) break;
  }

  console.log(
    `[earnings] ${symbol}: collected ${transcripts.length} transcripts via Alpha Vantage`,
  );
  return { transcripts };
}

/**
 * Fetch EPS beat/miss history from FMP (still works on current FMP plan).
 */
export async function fetchEarningsHistory(symbol, limit = 12) {
  const fmpKey = getFmpKey();
  if (!fmpKey) return [];
  const url = `${FMP_BASE}/earnings-surprises?symbol=${encodeURIComponent(symbol)}&limit=${limit}&apikey=${encodeURIComponent(fmpKey)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
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
