/**
 * Fetch daily historical close prices for multiple tickers in batched FMP calls.
 *
 * @returns {Promise<Record<string, Record<string, number>>>} { TICKER: { 'YYYY-MM-DD': close } }
 */
export async function fetchBatchedHistoricalPrices(symbols, fromDate, toDate) {
  const apiKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
  if (!apiKey || !symbols || symbols.length === 0) return {};

  const out = {};
  const CHUNK_SIZE = 5;

  for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
    const chunk = symbols.slice(i, i + CHUNK_SIZE);
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${chunk.join(',')}?from=${fromDate}&to=${toDate}&apikey=${apiKey}`;

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const json = await res.json();

      const list = json?.historicalStockList || (json?.historical ? [json] : []);
      for (const entry of list) {
        const symbol = entry.symbol;
        if (!symbol) continue;
        out[symbol] = {};
        for (const bar of entry.historical || []) {
          if (bar.date && bar.close != null) {
            out[symbol][bar.date] = Number(bar.close);
          }
        }
      }
    } catch {
      // Skip chunk — caller falls back to trade prices for missing tickers
    }
  }

  return out;
}
