/**
 * Daily closes for one US ticker, from whichever source has them. SERVER ONLY.
 *
 *   1. FMP historical-price-eod (the platform's main price source)
 *   2. Alpaca market data daily bars (IEX feed, split and dividend adjusted),
 *      when FMP refuses the symbol or returns nothing: the plan in use answers
 *      402/403 for many tickers (only 17 of 194 award tickers had prices)
 *   3. price_data_cache, whatever the award price sync already stored
 *
 * Returns { candles: [{ date, close }], source } oldest first, or
 * { candles: [], source: null } when nobody has the symbol.
 */
import { getAdminClient } from '@/lib/supabase';

const FMP = 'https://financialmodelingprep.com/stable/historical-price-eod/full';
const ALPACA = 'https://data.alpaca.markets/v2/stocks';
const TIMEOUT_MS = 8000;

const fmpKey = () => process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
/* FMP writes class shares with a dash (BRK-B); Alpaca keeps the dot (BRK.B). */
const fmpSymbol = (t) => String(t).replace(/\./g, '-');

async function timedFetch(url, init = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, cache: 'no-store', signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

const clean = (rows) =>
  rows
    .filter((r) => r.date && Number.isFinite(r.close) && r.close > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

async function fromFmp(ticker, from, to) {
  const key = fmpKey();
  if (!key) return [];
  try {
    const res = await timedFetch(
      `${FMP}?symbol=${encodeURIComponent(fmpSymbol(ticker))}&from=${from}&to=${to}&apikey=${encodeURIComponent(key)}`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    const bars = Array.isArray(json) ? json : json?.historical || [];
    return clean(bars.map((b) => ({ date: String(b.date).slice(0, 10), close: Number(b.close) })));
  } catch {
    return [];
  }
}

async function fromAlpaca(ticker, from) {
  const key = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_API_SECRET;
  if (!key || !secret) return [];
  const out = [];
  let token = null;
  try {
    for (let page = 0; page < 5; page += 1) {
      const qs = new URLSearchParams({
        timeframe: '1Day',
        start: from,
        adjustment: 'all',
        feed: 'iex',
        limit: '10000',
      });
      if (token) qs.set('page_token', token);
      // eslint-disable-next-line no-await-in-loop
      const res = await timedFetch(`${ALPACA}/${encodeURIComponent(ticker)}/bars?${qs}`, {
        headers: { 'APCA-API-KEY-ID': key, 'APCA-API-SECRET-KEY': secret },
      });
      if (!res.ok) break;
      // eslint-disable-next-line no-await-in-loop
      const json = await res.json();
      for (const b of json?.bars || []) {
        out.push({ date: String(b.t).slice(0, 10), close: Number(b.c) });
      }
      token = json?.next_page_token || null;
      if (!token) break;
    }
  } catch {
    /* fall through with what arrived */
  }
  return clean(out);
}

async function fromCache(ticker, from) {
  try {
    const { data, error } = await getAdminClient()
      .from('price_data_cache')
      .select('date, close')
      .eq('ticker', ticker)
      .gte('date', from)
      .order('date', { ascending: true })
      .limit(5000);
    if (error) return [];
    return clean((data || []).map((r) => ({ date: String(r.date), close: Number(r.close) })));
  } catch {
    return [];
  }
}

/**
 * @param {string} ticker  as filed (BRK.B, not BRK-B)
 * @param {string} from    YYYY-MM-DD
 * @param {string} [to]    YYYY-MM-DD, default today
 */
export async function getDailyBars(ticker, from, to = new Date().toISOString().slice(0, 10)) {
  const t = String(ticker || '')
    .trim()
    .toUpperCase();
  if (!t) return { candles: [], source: null };
  const fmp = await fromFmp(t, from, to);
  if (fmp.length >= 2) return { candles: fmp, source: 'fmp' };
  const alp = await fromAlpaca(t, from);
  if (alp.length >= 2) return { candles: alp, source: 'alpaca' };
  const cached = await fromCache(t, from);
  if (cached.length >= 2) return { candles: cached, source: 'cache' };
  return { candles: [], source: null };
}
