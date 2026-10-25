/**
 * Server-side last-price lookup (QA RET-10). Same provider order as
 * /api/fmp/quote: Alpha Vantage GLOBAL_QUOTE when configured, else FMP.
 * Server-only: provider keys never leave the server.
 */
import { fetchSingleGlobalQuote, getAlphaVantageApiKey } from '@/lib/alpha-vantage';
import { fetchWithTimeout } from '@/lib/http/fetch-json';

export function normalizeQuoteSymbol(sym) {
  return String(sym || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '');
}

/** FMP /stable/quote for one symbol, normalised; null on any failure. */
export async function fetchFmpQuote(symbol) {
  const fmpKey = process.env.FMP_API_KEY || '';
  if (!fmpKey) return null;
  const sym = normalizeQuoteSymbol(symbol);
  if (!sym) return null;
  try {
    const res = await fetchWithTimeout(
      `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(fmpKey)}`,
      { cache: 'no-store' },
      8000,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const q = Array.isArray(data) ? data[0] : data;
    if (!q?.price && !q?.previousClose) return null;
    const price = Number(q.price || q.previousClose);
    if (!Number.isFinite(price)) return null;
    return {
      symbol: String(q.symbol || sym).toUpperCase(),
      name: q.name || null,
      price,
      change: Number(q.change ?? 0),
      changesPercentage: Number(q.changesPercentage ?? 0),
      previousClose: Number(q.previousClose) || null,
      open: Number(q.open) || null,
      _source: 'fmp',
    };
  } catch {
    return null;
  }
}

/**
 * Best available server price for `symbol`: { symbol, price, source } or null.
 */
export async function getServerQuote(symbol) {
  const sym = normalizeQuoteSymbol(symbol);
  if (!sym) return null;
  if (getAlphaVantageApiKey()) {
    try {
      const av = await fetchSingleGlobalQuote(sym);
      if (av && av.price > 0)
        return { symbol: sym, price: Number(av.price), source: 'alpha_vantage' };
    } catch {
      /* fall through to FMP */
    }
  }
  const fmp = await fetchFmpQuote(sym);
  if (fmp && fmp.price > 0) return { symbol: sym, price: fmp.price, source: 'fmp' };
  return null;
}
