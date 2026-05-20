import { getAdminClient } from '@/lib/supabase';
import { fetchAV, getAlphaVantageApiKey } from '@/lib/alpha-vantage';

/** @typedef {{ date: string, open?: number, high?: number, low?: number, close: number, volume?: number }} PriceRow */

export const TRACKED_COMMODITIES = [
  { symbol: 'CL=F', name: 'Crude Oil (WTI)' },
  { symbol: 'NG=F', name: 'Natural Gas' },
  { symbol: 'GC=F', name: 'Gold' },
  { symbol: 'SI=F', name: 'Silver' },
  { symbol: 'HG=F', name: 'Copper' },
  { symbol: 'ZW=F', name: 'Wheat' },
  { symbol: 'ZC=F', name: 'Corn' },
  { symbol: 'ZS=F', name: 'Soybeans' },
  { symbol: 'KC=F', name: 'Coffee' },
  { symbol: 'CC=F', name: 'Cocoa' },
];

const FMP_BASE = 'https://financialmodelingprep.com/api/v3';

function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

/**
 * Map Yahoo-style commodity symbols to Alpha Vantage symbols.
 * AV uses different tickers for commodities.
 */
const AV_COMMODITY_MAP = {
  'CL=F': { fn: 'WTI', type: 'commodity' },
  'NG=F': { fn: 'NATURAL_GAS', type: 'commodity' },
  'GC=F': { fn: 'GOLD', type: 'commodity' },
  'ZW=F': { fn: 'WHEAT', type: 'commodity' },
  'ZC=F': { fn: 'CORN', type: 'commodity' },
  'CC=F': { fn: 'COFFEE', type: 'commodity' },
};

async function fetchFromAlphaVantage(symbol, fromDate, toDate) {
  const avKey = getAlphaVantageApiKey();
  if (!avKey) return [];

  const avMapping = AV_COMMODITY_MAP[symbol];

  if (avMapping?.type === 'commodity') {
    try {
      const data = await fetchAV(
        {
          function: avMapping.fn,
          interval: 'daily',
        },
        3600,
      );

      const seriesKey = Object.keys(data || {}).find((k) => k.includes('data'));
      if (!seriesKey) return [];

      const series = data[seriesKey];
      if (!Array.isArray(series)) return [];

      return series
        .filter((row) => {
          const date = row.date;
          return date >= fromDate && date <= toDate;
        })
        .map((row) => ({
          date: row.date,
          close: parseFloat(row.value),
        }))
        .filter((r) => Number.isFinite(r.close));
    } catch (err) {
      console.warn(`[kairos/commodity-prices] AV fetch failed for ${symbol}:`, err?.message);
      return [];
    }
  }

  try {
    const ticker = symbol.replace('=F', '');
    const data = await fetchAV(
      {
        function: 'TIME_SERIES_DAILY_ADJUSTED',
        symbol: ticker,
        outputsize: 'full',
      },
      3600,
    );

    const ts = data?.['Time Series (Daily)'];
    if (!ts) return [];

    return Object.entries(ts)
      .filter(([date]) => date >= fromDate && date <= toDate)
      .map(([date, ohlc]) => ({
        date,
        open: parseFloat(ohlc['1. open']),
        high: parseFloat(ohlc['2. high']),
        low: parseFloat(ohlc['3. low']),
        close: parseFloat(ohlc['4. close']),
        volume: parseInt(ohlc['6. volume'] || ohlc['5. volume'], 10),
      }))
      .filter((r) => Number.isFinite(r.close))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.warn(`[kairos/commodity-prices] AV equity fetch failed for ${symbol}:`, err?.message);
    return [];
  }
}

/**
 * @param {string} symbol
 * @param {string} fromDate
 * @param {string} toDate
 * @returns {Promise<PriceRow[]>}
 */
async function fetchFromFmp(symbol, fromDate, toDate) {
  const key = getFmpKey();
  if (!key) throw new Error('FMP_API_KEY not set');

  const url = `${FMP_BASE}/historical-price-full/${encodeURIComponent(symbol)}?from=${fromDate}&to=${toDate}&apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FMP HTTP ${res.status} for ${symbol}`);

  const json = await res.json();
  const historical = json?.historical || [];
  return historical.map((row) => ({
    date: row.date,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
  }));
}

/**
 * @param {string} symbol
 * @param {string} fromDate
 * @param {string} toDate
 * @returns {Promise<PriceRow[]>}
 */
export async function fetchCommodityHistory(symbol, fromDate, toDate) {
  if (!symbol || !fromDate || !toDate) {
    throw new Error('symbol, fromDate, toDate are all required');
  }

  const admin = getAdminClient();
  const { data: cached } = await admin
    .from('kairos_commodity_prices')
    .select('trade_date, open, high, low, close, volume')
    .eq('symbol', symbol)
    .gte('trade_date', fromDate)
    .lte('trade_date', toDate)
    .order('trade_date', { ascending: true });

  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor((new Date(toDate) - new Date(fromDate)) / dayMs);
  const expectedDays = Math.floor(totalDays * (5 / 7));
  const cachedDays = (cached || []).length;
  const coverage = expectedDays > 0 ? cachedDays / expectedDays : 0;

  const mapCachedRow = (r) => ({
    date: r.trade_date,
    open: r.open != null ? Number(r.open) : undefined,
    high: r.high != null ? Number(r.high) : undefined,
    low: r.low != null ? Number(r.low) : undefined,
    close: Number(r.close),
    volume: r.volume != null ? Number(r.volume) : undefined,
  });

  if (coverage >= 0.8) {
    return (cached || []).map(mapCachedRow);
  }

  let fmpRows = [];
  try {
    fmpRows = await fetchFromFmp(symbol, fromDate, toDate);
  } catch (e) {
    console.warn('[kairos/commodity-prices] FMP fetch failed:', symbol, e.message);
    try {
      fmpRows = await fetchFromAlphaVantage(symbol, fromDate, toDate);
      if (fmpRows.length > 0) {
        console.log(
          `[kairos/commodity-prices] AV fallback succeeded for ${symbol}: ${fmpRows.length} rows`,
        );
      }
    } catch (avErr) {
      console.warn('[kairos/commodity-prices] AV fallback also failed:', symbol, avErr.message);
    }
    if (fmpRows.length === 0) return (cached || []).map(mapCachedRow);
  }

  if (fmpRows.length === 0) {
    return (cached || []).map(mapCachedRow);
  }

  const upsertRows = fmpRows.map((r) => ({
    symbol,
    trade_date: r.date,
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
    source: 'fmp',
  }));

  const BATCH = 1000;
  for (let i = 0; i < upsertRows.length; i += BATCH) {
    const batch = upsertRows.slice(i, i + BATCH);
    await admin.from('kairos_commodity_prices').upsert(batch, { onConflict: 'symbol,trade_date' });
  }

  const dates = fmpRows.map((r) => r.date).sort();
  if (dates.length > 0) {
    await admin.from('kairos_commodity_cache_status').upsert({
      symbol,
      earliest_date: dates[0],
      latest_date: dates[dates.length - 1],
      last_full_refresh_at: new Date().toISOString(),
      source: 'fmp',
    });
  }

  return fmpRows;
}

/**
 * @param {Array<{ date: string, close: number }>} prices
 * @param {number} lookaheadDays
 * @returns {Map<string, number>}
 */
export function computeForwardReturns(prices, lookaheadDays) {
  const map = new Map();
  if (!Array.isArray(prices) || prices.length === 0) return map;

  const byDate = new Map(prices.map((p) => [p.date, p.close]));
  const sortedDates = prices.map((p) => p.date).sort();

  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    const startClose = byDate.get(date);
    if (!startClose) continue;

    const targetDate = new Date(date);
    targetDate.setDate(targetDate.getDate() + lookaheadDays);
    const targetIso = targetDate.toISOString().slice(0, 10);

    const futureDate = sortedDates.find((d) => d >= targetIso);
    if (!futureDate) continue;

    const futureClose = byDate.get(futureDate);
    if (!futureClose || startClose === 0) continue;

    const returnPct = ((futureClose - startClose) / startClose) * 100;
    map.set(date, returnPct);
  }

  return map;
}
