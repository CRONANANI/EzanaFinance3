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
 * at a time. Then it refreshes the award-window read models and the hubs.
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

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const apiKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
  if (!apiKey) {
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
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    if (Date.now() - started > BUDGET_MS) {
      skipped = todo.length - i;
      break;
    }
    const chunk = todo.slice(i, i + CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.all(chunk.map((t) => fetchCloses(apiKey, t.ticker, t.from, end)));
    const rows = [];
    results.forEach((r, k) => {
      if (!r.ok) {
        failed += 1;
        if (errors.length < 10) errors.push(`${chunk[k].ticker}: http ${r.status}`);
        return;
      }
      fetched += 1;
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
    done: skipped === 0,
    ms: Date.now() - started,
    errors,
  });
}
