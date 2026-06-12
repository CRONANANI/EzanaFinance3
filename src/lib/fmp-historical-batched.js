/**
 * Fetch daily historical close prices for multiple tickers in batched FMP calls.
 *
 * @returns {Promise<Record<string, Record<string, number>>>} { TICKER: { 'YYYY-MM-DD': close } }
 */
export async function fetchBatchedHistoricalPrices(symbols, fromDate, toDate) {
  const apiKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
  if (!apiKey || !symbols || symbols.length === 0) return {};

  const out = {};
  const CONCURRENCY = 5;

  // FMP's stable historical endpoint takes a SINGLE symbol and returns a flat
  // array — the v3 comma-list batch (which returned { historicalStockList })
  // was retired on 2025-08-31. Fetch each symbol, capping concurrency.
  async function fetchOne(symbol) {
    const url = `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${encodeURIComponent(symbol)}&from=${fromDate}&to=${toDate}&apikey=${apiKey}`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      const bars = Array.isArray(json) ? json : json?.historical || [];
      out[symbol] = {};
      for (const bar of bars) {
        if (bar.date && bar.close != null) {
          out[symbol][bar.date] = Number(bar.close);
        }
      }
    } catch {
      // Skip — caller falls back to trade prices for missing tickers
    }
  }

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const chunk = symbols.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(fetchOne));
  }

  return out;
}
