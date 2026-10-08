import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { alpacaKeys, fetchDailyWithFallback, fmpKey } from '@/lib/prices/daily';

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

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const apiKey = fmpKey();
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
      chunk.map((t) => fetchDailyWithFallback(t.ticker, t.from, end, { apiKey, keys })),
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
