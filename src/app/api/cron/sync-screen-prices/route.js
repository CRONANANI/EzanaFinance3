import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import { fmpQuotesForSync } from '@/lib/sonar/composer/analytics-server';

/**
 * GET /api/cron/sync-screen-prices (Sonar 6.4 hardening, Nov 28 2026)
 *
 * Stores one daily close per screenable company (ticker_sectors) in price_data_cache, so a
 * valuation screen reads stored closes for the whole universe instead of one live quote per
 * company at question time (which is capped, making large screens bounded).
 *
 * Source: FMP /stable/quote (Ezana's licensed price source; the bulk endpoint answers 402 on
 * the current plan), 8 in flight. Runs after the US close only (the quote then equals the
 * close); writes the quote's own date. Tickers another job already keeps prices for (a row
 * in the last 30 days, e.g. the Quant Lab universe) are left to that job. Resumable: tickers
 * without today's close first, up to ?max per run. Idempotent: upsert on (ticker, date).
 *
 * Dispatched by /api/cron/dispatch only when SONAR_PRICE_SYNC is set (FMP call budget is an
 * owner decision: about 6,000 quotes a trading day). CRON_SECRET bearer only.
 *   ?max=1500   quotes per run      ?dry=1   report only
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const BUDGET_MS = 240_000;

/** True after 21:05 UTC (EST close) or 20:05 UTC in daylight time, on a weekday. */
function afterClose(now) {
  const d = now.getUTCDay();
  if (d === 0 || d === 6) return false;
  const m = now.getUTCHours() * 60 + now.getUTCMinutes();
  const month = now.getUTCMonth();
  const dst = month > 2 && month < 10; // Apr to Oct: approximate US daylight time
  return m >= (dst ? 20 * 60 + 5 : 21 * 60 + 5);
}

async function pageAll(build) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await build().range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function run(request) {
  const started = Date.now();
  const now = new Date();
  const sp = new URL(request.url).searchParams;
  const max = Math.min(3000, Math.max(1, Number(sp.get('max')) || 1500));
  const dry = sp.get('dry') === '1';
  if (!afterClose(now) && !dry)
    return NextResponse.json({ ok: true, skipped: 'before the US close' });
  const admin = getAdminClient();
  const today = now.toISOString().slice(0, 10);
  const since = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);

  const tickers = (
    await pageAll(() => admin.from('ticker_sectors').select('ticker').order('ticker'))
  ).map((r) => String(r.ticker).toUpperCase());
  const recent = await pageAll(() =>
    admin
      .from('price_data_cache')
      .select('ticker, date, volume')
      .gte('date', since)
      .order('ticker')
      .order('date'),
  );
  /* Rows this job writes carry volume null; a ticker with any other recent row is kept by
     another job. */
  const owned = new Set(recent.filter((r) => r.volume != null).map((r) => r.ticker));
  const haveToday = new Set(recent.filter((r) => r.date === today).map((r) => r.ticker));
  const queue = tickers.filter((t) => !owned.has(t) && !haveToday.has(t)).slice(0, max);
  if (dry)
    return NextResponse.json({
      ok: true,
      dry: true,
      universe: tickers.length,
      owned: owned.size,
      queued: queue.length,
    });

  const rows = [];
  let asked = 0;
  for (let i = 0; i < queue.length; i += 200) {
    if (Date.now() - started > BUDGET_MS) break;
    const group = queue.slice(i, i + 200);
    asked += group.length;
    // eslint-disable-next-line no-await-in-loop
    const q = await fmpQuotesForSync(group);
    for (const t of group) {
      const p = q[t];
      if (!p || !Number.isFinite(p.price) || p.price <= 0) continue;
      rows.push({ ticker: t, date: p.asOf, close: p.price, adj_close: p.price, volume: null });
    }
  }
  let written = 0;
  const errors = [];
  for (let i = 0; i < rows.length; i += 500) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin
      .from('price_data_cache')
      .upsert(rows.slice(i, i + 500), { onConflict: 'ticker,date' });
    if (error) errors.push(error.message);
    else written += Math.min(500, rows.length - i);
  }
  return NextResponse.json({
    ok: errors.length === 0,
    universe: tickers.length,
    queued: queue.length,
    rowsRead: asked,
    written,
    unpriced: asked - rows.length,
    ms: Date.now() - started,
    errors,
  });
}

export const GET = cronRoute('sync-screen-prices', run, { ttlSeconds: 300 });
