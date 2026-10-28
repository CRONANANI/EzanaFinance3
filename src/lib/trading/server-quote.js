/**
 * Server-side last-price lookup (QA RET-10). Provider order: FMP first
 * (system of record for equity prices), Alpha Vantage as fallback.
 * Server-only: provider keys never leave the server.
 */
import { fetchSingleGlobalQuote, getAlphaVantageApiKey } from '@/lib/alpha-vantage';
import { fetchWithTimeout } from '@/lib/http/fetch-json';

const FMP_BASE = 'https://financialmodelingprep.com/stable';

export function normalizeQuoteSymbol(sym) {
  return String(sym || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '');
}

function normalizeFmpRow(q, fallbackSym) {
  if (!q) return null;
  const price = Number(q.price || q.previousClose);
  if (!Number.isFinite(price) || price <= 0) return null;
  return {
    symbol: String(q.symbol || fallbackSym).toUpperCase(),
    name: q.name || null,
    price,
    change: Number(q.change ?? 0),
    /* /stable returns changePercentage; v3 returned changesPercentage. */
    changesPercentage: Number(q.changePercentage ?? q.changesPercentage ?? 0),
    previousClose: Number(q.previousClose) || null,
    open: Number(q.open) || null,
    _source: 'fmp',
  };
}

/** FMP /stable/quote for one symbol, normalised; null on any failure. */
export async function fetchFmpQuote(symbol) {
  const fmpKey = process.env.FMP_API_KEY || '';
  if (!fmpKey) return null;
  const sym = normalizeQuoteSymbol(symbol);
  if (!sym) return null;
  try {
    const res = await fetchWithTimeout(
      `${FMP_BASE}/quote?symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(fmpKey)}`,
      { cache: 'no-store' },
      8000,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return normalizeFmpRow(Array.isArray(data) ? data[0] : data, sym);
  } catch {
    return null;
  }
}

/**
 * FMP /stable/batch-quote: one upstream call for many symbols.
 * Returns { [SYMBOL]: normalisedQuote }. Missing symbols are simply absent.
 */
export async function fetchFmpBatchQuotes(symbols) {
  const fmpKey = process.env.FMP_API_KEY || '';
  const list = [...new Set((symbols || []).map(normalizeQuoteSymbol).filter(Boolean))];
  if (!fmpKey || list.length === 0) return {};
  const out = {};
  for (let i = 0; i < list.length; i += 100) {
    const group = list.slice(i, i + 100);
    try {
      const res = await fetchWithTimeout(
        `${FMP_BASE}/batch-quote?symbols=${encodeURIComponent(group.join(','))}&apikey=${encodeURIComponent(fmpKey)}`,
        { cache: 'no-store' },
        8000,
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data)) continue;
      for (const row of data) {
        const q = normalizeFmpRow(row, row?.symbol);
        if (q) out[normalizeQuoteSymbol(q.symbol)] = q;
      }
    } catch {
      /* group failed: callers fall back per symbol */
    }
  }
  return out;
}

/**
 * Best available server price for `symbol`: { symbol, price, source } or null.
 */
export async function getServerQuote(symbol) {
  const sym = normalizeQuoteSymbol(symbol);
  if (!sym) return null;
  const fmp = await fetchFmpQuote(sym);
  if (fmp && fmp.price > 0) return { symbol: sym, price: fmp.price, source: 'fmp' };
  if (getAlphaVantageApiKey()) {
    try {
      const av = await fetchSingleGlobalQuote(sym);
      if (av && av.price > 0)
        return { symbol: sym, price: Number(av.price), source: 'alpha_vantage' };
    } catch {
      /* no price */
    }
  }
  return null;
}
