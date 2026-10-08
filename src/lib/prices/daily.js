/**
 * Daily price bars from the two market data sources, as rows shaped for
 * price_data_cache: { ticker, date, open, high, low, close, adj_close, volume }.
 * FMP first (FMP_API_KEY); Alpaca daily bars on the IEX feed when FMP refuses
 * a symbol (its plan answers 402 or 403 for many) or has no bars for it
 * (ALPACA_API_KEY / ALPACA_API_SECRET). Never throws: { ok, status, rows }.
 * SERVER ONLY.
 */

const TIMEOUT_MS = 15000;
const ALPACA_DATA = 'https://data.alpaca.markets/v2/stocks';

const fin = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

export const fmpKey = () => process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';

export function alpacaKeys() {
  const id = process.env.ALPACA_API_KEY || '';
  const secret = process.env.ALPACA_API_SECRET || '';
  return id && secret ? { id, secret } : null;
}

/* FMP writes class shares with a dash (BRK-B); we store the ticker as filed. */
const fmpSymbol = (t) => String(t).replace(/\./g, '-');

async function getJson(url, init) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) return { ok: false, status: res.status, json: null };
    return { ok: true, status: res.status, json: await res.json() };
  } catch {
    return { ok: false, status: 0, json: null };
  } finally {
    clearTimeout(timer);
  }
}

/** FMP end-of-day bars for [from, to] (YYYY-MM-DD). */
export async function fetchFmpDaily(apiKey, ticker, from, to) {
  if (!apiKey) return { ok: false, status: 0, rows: [] };
  const url = `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${encodeURIComponent(
    fmpSymbol(ticker),
  )}&from=${from}&to=${to}&apikey=${apiKey}`;
  const r = await getJson(url);
  if (!r.ok) return { ok: false, status: r.status, rows: [] };
  const bars = Array.isArray(r.json) ? r.json : r.json?.historical || [];
  const rows = [];
  for (const b of bars) {
    const close = Number(b.close);
    if (!b.date || !Number.isFinite(close) || close <= 0) continue;
    rows.push({
      ticker,
      date: String(b.date).slice(0, 10),
      open: fin(b.open),
      high: fin(b.high),
      low: fin(b.low),
      close,
      adj_close: fin(b.adjClose) ?? close,
      volume: fin(b.volume) == null ? null : Math.round(Number(b.volume)),
    });
  }
  return { ok: true, status: r.status, rows };
}

/** Alpaca daily bars (IEX feed, split and dividend adjusted), paged. */
export async function fetchAlpacaDaily(keys, ticker, from, to) {
  if (!keys) return { ok: false, status: 0, rows: [] };
  const rows = [];
  let token = null;
  for (let page = 0; page < 20; page += 1) {
    const qs = new URLSearchParams({
      timeframe: '1Day',
      start: from,
      end: to,
      feed: 'iex',
      adjustment: 'all',
      limit: '10000',
    });
    if (token) qs.set('page_token', token);
    // eslint-disable-next-line no-await-in-loop
    const r = await getJson(`${ALPACA_DATA}/${encodeURIComponent(ticker)}/bars?${qs}`, {
      headers: { 'APCA-API-KEY-ID': keys.id, 'APCA-API-SECRET-KEY': keys.secret },
    });
    if (!r.ok) return { ok: false, status: r.status, rows: [] };
    for (const b of r.json?.bars || []) {
      const close = Number(b.c);
      if (!b.t || !Number.isFinite(close) || close <= 0) continue;
      rows.push({
        ticker,
        date: String(b.t).slice(0, 10),
        open: fin(b.o),
        high: fin(b.h),
        low: fin(b.l),
        close,
        adj_close: close,
        volume: fin(b.v) == null ? null : Math.round(Number(b.v)),
      });
    }
    token = r.json?.next_page_token || null;
    if (!token) break;
  }
  return { ok: true, status: 200, rows };
}

/**
 * FMP first; Alpaca when FMP refuses the symbol or has no bars for it.
 * { ok, status, rows, source: 'fmp' | 'alpaca' | 'none', alpacaStatus }.
 */
export async function fetchDailyWithFallback(
  ticker,
  from,
  to,
  { apiKey = fmpKey(), keys = alpacaKeys() } = {},
) {
  const fmp = await fetchFmpDaily(apiKey, ticker, from, to);
  if (fmp.ok && fmp.rows.length) return { ...fmp, source: 'fmp' };
  if (!keys) return { ...fmp, source: 'fmp' };
  const alp = await fetchAlpacaDaily(keys, ticker, from, to);
  if (alp.ok && alp.rows.length) return { ...alp, source: 'alpaca' };
  /* Both answered with nothing: a quiet window (no new trading days) is fine. */
  if (fmp.ok || alp.ok)
    return { ok: true, status: 200, rows: [], source: fmp.ok ? 'fmp' : 'alpaca' };
  return {
    ok: false,
    status: fmp.status || alp.status,
    rows: [],
    source: 'none',
    alpacaStatus: alp.status,
  };
}
