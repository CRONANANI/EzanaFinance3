import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';

/**
 * GET /api/cron/sync-award-prices
 *
 * Daily closes for every company with a resolved federal contract award, into
 * price_data_cache, so the Capitol hub can measure returns on trades made near
 * an award. Each ticker is fetched from the day after its last stored close
 * (or 40 days before its first award) to today: one FMP call per ticker, five
 * at a time. When FMP refuses a symbol (plan limits answer 402 or 403) or
 * returns no bars, the same window is read from Alpaca's daily bars (IEX
 * feed, ALPACA_API_KEY / ALPACA_API_SECRET). Then it refreshes the
 * award-window read models and the hubs. The response counts each source.
 *
 * Query: ?limit=N caps the tickers this run (default all). Idempotent: rows
 * upsert on (ticker, date).
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CONCURRENCY = 5;
const UPSERT_CHUNK = 1000;
const BUDGET_MS = 240000;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if ((request.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  try {
    return new URL(request.url).searchParams.get('key') === secret;
  } catch {
    return false;
  }
}

const today = () => new Date().toISOString().slice(0, 10);
const nextDay = (iso) => new Date(Date.parse(iso) + 86400000).toISOString().slice(0, 10);

/* FMP writes class shares with a dash (BRK-B); we store the ticker as filed. */
const fmpSymbol = (t) => String(t).replace(/\./g, '-');

async function fetchCloses(apiKey, ticker, from, to) {
  const url = `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${encodeURIComponent(
    fmpSymbol(ticker),
  )}&from=${from}&to=${to}&apikey=${apiKey}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) return { ok: false, status: res.status, rows: [] };
    const json = await res.json();
    const bars = Array.isArray(json) ? json : json?.historical || [];
    const rows = [];
    for (const b of bars) {
      const close = Number(b.close);
      if (!b.date || !Number.isFinite(close) || close <= 0) continue;
      rows.push({
        ticker,
        date: String(b.date).slice(0, 10),
        open: Number.isFinite(Number(b.open)) ? Number(b.open) : null,
        high: Number.isFinite(Number(b.high)) ? Number(b.high) : null,
        low: Number.isFinite(Number(b.low)) ? Number(b.low) : null,
        close,
        adj_close: Number.isFinite(Number(b.adjClose)) ? Number(b.adjClose) : close,
        volume: Number.isFinite(Number(b.volume)) ? Math.round(Number(b.volume)) : null,
      });
    }
    return { ok: true, status: res.status, rows };
  } catch {
    return { ok: false, status: 0, rows: [] };
  } finally {
    clearTimeout(timer);
  }
}

const ALPACA_DATA = 'https://data.alpaca.markets/v2/stocks';
const alpacaKeys = () => {
  const id = process.env.ALPACA_API_KEY || '';
  const secret = process.env.ALPACA_API_SECRET || '';
  return id && secret ? { id, secret } : null;
};

/** Daily bars from Alpaca (IEX feed, split and dividend adjusted), paged. */
async function fetchAlpacaCloses(keys, ticker, from, to) {
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
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(`${ALPACA_DATA}/${encodeURIComponent(ticker)}/bars?${qs}`, {
        headers: { 'APCA-API-KEY-ID': keys.id, 'APCA-API-SECRET-KEY': keys.secret },
        cache: 'no-store',
        signal: ctrl.signal,
      });
      if (!res.ok) return { ok: false, status: res.status, rows: [] };
      // eslint-disable-next-line no-await-in-loop
      const json = await res.json();
      for (const b of json?.bars || []) {
        const close = Number(b.c);
        if (!b.t || !Number.isFinite(close) || close <= 0) continue;
        rows.push({
          ticker,
          date: String(b.t).slice(0, 10),
          open: Number.isFinite(Number(b.o)) ? Number(b.o) : null,
          high: Number.isFinite(Number(b.h)) ? Number(b.h) : null,
          low: Number.isFinite(Number(b.l)) ? Number(b.l) : null,
          close,
          adj_close: close,
          volume: Number.isFinite(Number(b.v)) ? Math.round(Number(b.v)) : null,
        });
      }
      token = json?.next_page_token || null;
      if (!token) break;
    } catch {
      return { ok: false, status: 0, rows: [] };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: true, status: 200, rows };
}

/** FMP first; Alpaca when FMP refuses the symbol or has no bars for it. */
async function fetchWithFallback(apiKey, keys, ticker, from, to) {
  const fmp = apiKey
    ? await fetchCloses(apiKey, ticker, from, to)
    : { ok: false, status: 0, rows: [] };
  if (fmp.ok && fmp.rows.length) return { ...fmp, source: 'fmp' };
  if (!keys) return { ...fmp, source: 'fmp' };
  const alp = await fetchAlpacaCloses(keys, ticker, from, to);
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

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const apiKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
  const keys = alpacaKeys();
  if (!apiKey && !keys) {
    return NextResponse.json({ error: 'price source not configured' }, { status: 500 });
  }

  const started = Date.now();
  const admin = getAdminClient();
  const errors = [];
  const limit = Number(new URL(request.url).searchParams.get('limit')) || null;

  const { data: targets, error: tErr } = await admin.rpc('award_price_targets');
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  const end = today();
  const todo = (targets || [])
    .map((t) => ({ ticker: t.ticker, from: t.last_date ? nextDay(t.last_date) : t.from_date }))
    .filter((t) => t.ticker && t.from && t.from <= end)
    .slice(0, limit || undefined);

  let fetched = 0;
  let stored = 0;
  let failed = 0;
  let skipped = 0;
  const sources = { fmp: 0, alpaca: 0 };
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    if (Date.now() - started > BUDGET_MS) {
      skipped = todo.length - i;
      break;
    }
    const chunk = todo.slice(i, i + CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.all(
      chunk.map((t) => fetchWithFallback(apiKey, keys, t.ticker, t.from, end)),
    );
    const rows = [];
    results.forEach((r, k) => {
      if (!r.ok) {
        failed += 1;
        if (errors.length < 10)
          errors.push(
            `${chunk[k].ticker}: fmp http ${r.status}${keys ? `, alpaca http ${r.alpacaStatus ?? 'n/a'}` : ''}`,
          );
        return;
      }
      fetched += 1;
      if (r.rows.length) sources[r.source] = (sources[r.source] || 0) + 1;
      rows.push(...r.rows);
    });
    for (let j = 0; j < rows.length; j += UPSERT_CHUNK) {
      // eslint-disable-next-line no-await-in-loop
      const { error } = await admin
        .from('price_data_cache')
        .upsert(rows.slice(j, j + UPSERT_CHUNK), { onConflict: 'ticker,date' });
      if (error) {
        if (errors.length < 10) errors.push(`upsert: ${error.message}`);
      } else {
        stored += Math.min(UPSERT_CHUNK, rows.length - j);
      }
    }
  }

  const { error: mvErr } = await admin.rpc('refresh_award_window_trades');
  if (mvErr) errors.push(`refresh: ${mvErr.message}`);
  revalidateTag('hubs');

  return NextResponse.json({
    tickers: todo.length,
    fetched,
    failed,
    skipped,
    stored,
    sources,
    alpaca: Boolean(keys),
    done: skipped === 0,
    ms: Date.now() - started,
    errors,
  });
}
