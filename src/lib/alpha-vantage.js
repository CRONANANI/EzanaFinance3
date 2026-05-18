/**
 * Alpha Vantage HTTP helpers — server-side only. Never expose the API key to the client.
 */

import { normalizeAlphaVantageMover } from '@/lib/fmp/movers';

const ALPHA_BASE = 'https://www.alphavantage.co/query';

/** Simple in-memory cache (per server instance / cold start resets). */
const cache = new Map();

export function getAlphaVantageApiKey() {
  return process.env.ALPHA_VANTAGE_API_KEY || process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || null;
}

function alphaInfoOrLimitError(data) {
  if (!data || typeof data !== 'object') return null;
  const msg =
    data.Note ||
    data.Information ||
    data['Error Message'] ||
    data.information ||
    (typeof data.note === 'string' ? data.note : null);
  if (msg && typeof msg === 'string') {
    return msg;
  }
  return null;
}

/**
 * @param {Record<string, string>} params Query params (function, symbol, etc.)
 * @param {number} cacheTtlSeconds 0 = no cache
 */
export async function fetchAV(params, cacheTtlSeconds = 0) {
  const apiKey = getAlphaVantageApiKey();
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured');
  }

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, apikey: apiKey })) {
    if (v === undefined || v === null || v === '') continue;
    qs.append(k, String(v));
  }

  const url = `${ALPHA_BASE}?${qs.toString()}`;
  const cacheKey = url;

  if (cacheTtlSeconds > 0) {
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < cacheTtlSeconds * 1000) {
      return hit.data;
    }
  }

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Alpha Vantage HTTP ${res.status}`);
  }
  const data = await res.json();

  const softErr = alphaInfoOrLimitError(data);
  if (softErr) {
    throw new Error(softErr);
  }

  if (cacheTtlSeconds > 0) {
    cache.set(cacheKey, { at: Date.now(), data });
  }
  return data;
}

function num(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseGlobalQuote(data) {
  const gq = data['Global Quote'];
  if (!gq || typeof gq !== 'object') return null;
  const symbol = String(gq['01. symbol'] || '')
    .trim()
    .toUpperCase();
  if (!symbol) return null;
  const price = num(gq['05. price']);
  const change = num(gq['09. change']);
  const pctRaw = gq['10. change percent'];
  let changePercent = num(String(pctRaw || '').replace('%', ''));
  const open = num(gq['02. open']);
  const high = num(gq['03. high']);
  const low = num(gq['04. low']);
  const prevClose = num(gq['08. previous close']);
  const volume = gq['06. volume'];
  if (changePercent == null && price != null && prevClose != null && prevClose !== 0) {
    changePercent = ((price - prevClose) / prevClose) * 100;
  }
  return {
    symbol,
    price: price ?? 0,
    change: change ?? 0,
    changePercent: changePercent ?? 0,
    high: high ?? price ?? 0,
    low: low ?? price ?? 0,
    open: open ?? price ?? 0,
    prevClose: prevClose ?? price ?? 0,
    volume: volume != null ? Number(volume) : undefined,
    lastRegularSessionPrice: price ?? 0,
  };
}

function extractBulkRows(data) {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.data)) return data.data;
  const arrKey = Object.keys(data).find((k) => {
    if (k === 'Note' || k === 'Information' || k === 'Meta Data') return false;
    return Array.isArray(data[k]);
  });
  if (arrKey) return data[arrKey];
  return [];
}

function bulkRowToQuote(row) {
  const symbol = String(row.symbol || row.ticker || row['01. symbol'] || '')
    .trim()
    .toUpperCase();
  if (!symbol) return null;

  const price = num(row.price ?? row.close ?? row['05. price']);
  const prevClose = num(row.previous_close ?? row.previousClose ?? row['08. previous close']);
  let change = num(row.change ?? row.change_amount ?? row.changeAmount);
  if (change == null && price != null && prevClose != null) {
    change = price - prevClose;
  }
  let changePercent = num(
    row.change_percent ??
      row.changePercentage ??
      row.change_percentage ??
      String(row['10. change percent'] || '').replace('%', ''),
  );
  if (changePercent == null && price != null && prevClose != null && prevClose !== 0) {
    changePercent = ((price - prevClose) / prevClose) * 100;
  }

  const high = num(row.high ?? row['03. high']);
  const low = num(row.low ?? row['04. low']);
  const open = num(row.open ?? row['02. open']);
  const p = price ?? 0;
  const pc = prevClose ?? p;

  return {
    symbol,
    price: p,
    change: change ?? 0,
    changePercent: changePercent ?? 0,
    high: high ?? p,
    low: low ?? p,
    open: open ?? p,
    prevClose: pc,
    lastRegularSessionPrice: p,
  };
}

/**
 * @param {string[]} symbols Uppercased tickers, max 100
 * @returns {Record<string, ReturnType<typeof bulkRowToQuote>>}
 */
export async function fetchBulkQuotesNormalized(symbols) {
  if (!symbols.length) return {};
  const joined = symbols.slice(0, 100).join(',');
  const data = await fetchAV({ function: 'REALTIME_BULK_QUOTES', symbol: joined }, 30);
  const rows = extractBulkRows(data);
  const quotes = {};
  for (const row of rows) {
    const q = bulkRowToQuote(row);
    if (q) quotes[q.symbol] = q;
  }
  return quotes;
}

/**
 * Full list with chunking (100 per Alpha Vantage request).
 */
export async function fetchAllBulkQuotesAlpha(symbols) {
  const upper = [...new Set(symbols.map((s) => String(s).trim().toUpperCase()).filter(Boolean))];
  const merged = {};
  for (let i = 0; i < upper.length; i += 100) {
    const chunk = upper.slice(i, i + 100);
    const part = await fetchBulkQuotesNormalized(chunk);
    Object.assign(merged, part);
  }
  return merged;
}

export async function fetchSingleGlobalQuote(symbol) {
  const sym = String(symbol).trim().toUpperCase();
  if (!sym) return null;
  const data = await fetchAV({ function: 'GLOBAL_QUOTE', symbol: sym }, 30);
  return parseGlobalQuote(data);
}

/**
 * @param {number} limit
 */
export async function fetchAlphaTopMovers(limit) {
  const data = await fetchAV({ function: 'TOP_GAINERS_LOSERS' }, 60);
  const gainers = Array.isArray(data.top_gainers) ? data.top_gainers : [];
  const losers = Array.isArray(data.top_losers) ? data.top_losers : [];
  return {
    gainers: gainers.slice(0, limit).map(normalizeAlphaVantageMover),
    losers: losers.slice(0, limit).map(normalizeAlphaVantageMover),
  };
}

// ============================================================================
// COMMODITY QUOTES — maps watchlist futures symbols to AV commodity endpoints
// ============================================================================

/**
 * Map of commodity quoteSymbols used on the Watchlist page to the
 * correct Alpha Vantage endpoint + parameters.
 *
 * AV Commodity endpoints:
 *   GOLD_SILVER_SPOT  — live spot for gold (GOLD) and silver (SILVER)
 *   WTI, BRENT, NATURAL_GAS — daily
 *   COPPER, WHEAT, CORN, COTTON, SUGAR, COFFEE, ALUMINUM — typically monthly
 */
const COMMODITY_AV_MAP = {
  'GC=F': {
    fn: 'GOLD_SILVER_SPOT',
    spotSymbol: 'GOLD',
    name: 'Gold',
  },
  'SI=F': {
    fn: 'GOLD_SILVER_SPOT',
    spotSymbol: 'SILVER',
    name: 'Silver',
  },
  'PL=F': { fn: null, etfFallback: 'PPLT', name: 'Platinum' },
  'PA=F': { fn: null, etfFallback: 'PALL', name: 'Palladium' },
  'HG=F': { fn: 'COPPER', interval: 'monthly', name: 'Copper' },
  'CL=F': { fn: 'WTI', interval: 'daily', name: 'Oil (WTI)' },
  'NG=F': { fn: 'NATURAL_GAS', interval: 'daily', name: 'Nat Gas' },
  'ZW=F': { fn: 'WHEAT', interval: 'monthly', name: 'Wheat' },
  'ZC=F': { fn: 'CORN', interval: 'monthly', name: 'Corn' },
  'BZ=F': { fn: 'BRENT', interval: 'daily', name: 'Brent Crude' },
  'CT=F': { fn: 'COTTON', interval: 'monthly', name: 'Cotton' },
  'SB=F': { fn: 'SUGAR', interval: 'monthly', name: 'Sugar' },
  'KC=F': { fn: 'COFFEE', interval: 'monthly', name: 'Coffee' },
  'ALI=F': { fn: 'ALUMINUM', interval: 'monthly', name: 'Aluminum' },
};

/**
 * @param {Record<string, unknown>} data
 * @returns {Array<{ date?: string; value?: string }>}
 */
function commodityHistoryRows(data) {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.data)) return data.data;
  for (const k of Object.keys(data)) {
    if (
      k === 'name' ||
      k === 'unit' ||
      k === 'interval' ||
      k === 'Note' ||
      k === 'Information' ||
      k === 'Error Message' ||
      k === 'Meta Data'
    ) {
      continue;
    }
    if (Array.isArray(data[k])) return data[k];
  }
  return [];
}

/**
 * @param {string} symbol
 */
export function isCommoditySymbol(symbol) {
  return Object.hasOwn(COMMODITY_AV_MAP, symbol);
}

/**
 * @param {string} symbol
 */
async function fetchSingleCommodityQuote(symbol) {
  const config = COMMODITY_AV_MAP[symbol];
  if (!config) return null;

  try {
    if (config.fn === 'GOLD_SILVER_SPOT') {
      const spotData = await fetchAV(
        { function: 'GOLD_SILVER_SPOT', symbol: config.spotSymbol },
        60,
      );

      let price = num(spotData?.price ?? spotData?.spot_price);
      let prevClose = num(spotData?.previous_close ?? spotData?.previousClose);

      if (price == null) {
        const rows = commodityHistoryRows(spotData);
        if (rows.length >= 2) {
          price = parseFloat(String(rows[0].value ?? ''));
          prevClose = parseFloat(String(rows[1].value ?? ''));
        }
      }

      if (price == null || !Number.isFinite(price)) return null;

      let change = null;
      let changePercent = null;
      if (prevClose != null && Number.isFinite(prevClose) && prevClose > 0) {
        change = price - prevClose;
        changePercent = ((price - prevClose) / prevClose) * 100;
      }

      return {
        symbol,
        price,
        change: change ?? 0,
        changePercent: changePercent ?? 0,
        high: num(spotData?.high) ?? price,
        low: num(spotData?.low) ?? price,
        open: num(spotData?.open) ?? prevClose ?? price,
        prevClose: prevClose ?? price,
        lastRegularSessionPrice: price,
        _source: 'av_commodity_spot',
      };
    }

    if (config.fn) {
      const params = { function: config.fn, interval: config.interval || 'daily' };
      const raw = await fetchAV(params, 120);

      const arr = commodityHistoryRows(raw).filter(
        (d) => d.value != null && d.value !== '' && d.value !== '.',
      );
      if (arr.length < 2) return null;

      const latest = parseFloat(String(arr[0].value));
      const prev = parseFloat(String(arr[1].value));

      if (!Number.isFinite(latest) || !Number.isFinite(prev) || prev === 0) return null;

      const change = latest - prev;
      const changePercent = (change / prev) * 100;

      return {
        symbol,
        price: latest,
        change: parseFloat(change.toFixed(4)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        high: latest,
        low: latest,
        open: prev,
        prevClose: prev,
        lastRegularSessionPrice: latest,
        _source: 'av_commodity_history',
      };
    }

    if (config.etfFallback) {
      const q = await fetchSingleGlobalQuote(config.etfFallback);
      if (!q) return null;
      return { ...q, symbol };
    }

    return null;
  } catch (err) {
    console.warn(`[av-commodity] ${symbol} (${config.name}) failed:`, err?.message);
    return null;
  }
}

/**
 * @param {string[]} symbols — commodity futures symbols (e.g. ['GC=F', 'CL=F'])
 * @returns {Promise<Record<string, ReturnType<typeof bulkRowToQuote> & { _source?: string }>>}
 */
export async function fetchCommodityQuotes(symbols) {
  const commoditySymbols = symbols.filter(isCommoditySymbol);
  if (commoditySymbols.length === 0) return {};

  const results = await Promise.allSettled(
    commoditySymbols.map((sym) => fetchSingleCommodityQuote(sym)),
  );

  const quotes = {};
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      quotes[r.value.symbol] = r.value;
    }
  }

  return quotes;
}
