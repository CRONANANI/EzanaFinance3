import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import { getDailyOhlcv } from '@/lib/prices/daily-bars';

/**
 * GET /api/cron/sync-quant-universe
 *
 * Keeps daily prices for the Quant Lab factor universe (public.quant_universe)
 * in price_data_cache, so a factor study can rank about 160 stocks over ten
 * years from one stored table instead of 160 downloads per request.
 *
 * Per ticker, each run does one of:
 *   backfill  nothing stored, or the stored history starts too late: load the
 *             whole window.
 *   extend    load from ten days before the last stored close to today.
 *   reload    the newly loaded close for the last stored date no longer
 *             matches what is stored (a split or a restated adjustment):
 *             load the whole window again so one price scale is kept.
 *
 * Tickers with the least history go first. A run that hits its time budget
 * stops cleanly; the next run carries on. Idempotent: rows upsert on
 * (ticker, date).
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Eleven years: ten for the longest study plus a year of factor lookback. */
const HISTORY_DAYS = 11 * 366;
const OVERLAP_DAYS = 10;
const CONCURRENCY = 5;
const UPSERT_CHUNK = 1000;
const BUDGET_MS = 240000;
/** A stored close this far from the fresh one means the price scale changed. */
const RESCALE_TOLERANCE = 0.005;

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

const toRows = (ticker, bars) =>
  bars.map((b) => ({
    ticker,
    date: b.date,
    open: b.open ?? null,
    high: b.high ?? null,
    low: b.low ?? null,
    close: b.close,
    adj_close: b.close,
    volume: Number.isFinite(b.volume) ? Math.round(b.volume) : null,
  }));

async function syncOne(state, target, end) {
  const needsBackfill =
    !state.last_date ||
    !state.first_date ||
    state.first_date > iso(Date.parse(target) + 30 * 86400000);
  if (needsBackfill) {
    const { bars } = await getDailyOhlcv(state.ticker, target, end);
    return { mode: 'backfill', rows: toRows(state.ticker, bars) };
  }
  const from = iso(Date.parse(state.last_date) - OVERLAP_DAYS * 86400000);
  const { bars } = await getDailyOhlcv(state.ticker, from, end);
  const same = bars.find((b) => b.date === state.last_date);
  const rescaled =
    same && state.last_close > 0 && Math.abs(same.close / state.last_close - 1) > RESCALE_TOLERANCE;
  if (rescaled) {
    const full = await getDailyOhlcv(state.ticker, target, end);
    return { mode: 'reload', rows: toRows(state.ticker, full.bars) };
  }
  return { mode: 'extend', rows: toRows(state.ticker, bars) };
}

async function run() {
  const started = Date.now();
  const admin = getAdminClient();
  const { data: states, error } = await admin.rpc('quant_universe_price_state');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const end = iso(Date.now());
  const target = iso(Date.now() - HISTORY_DAYS * 86400000);
  /* Least history first, so a fresh universe fills before anything is topped up. */
  const todo = [...(states || [])].sort((a, b) => Number(a.bars) - Number(b.bars));

  const modes = { backfill: 0, extend: 0, reload: 0 };
  const errors = [];
  let stored = 0;
  let empty = 0;
  let skipped = 0;
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    if (Date.now() - started > BUDGET_MS) {
      skipped = todo.length - i;
      break;
    }
    const chunk = todo.slice(i, i + CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.all(
      chunk.map(async (state) => {
        try {
          return await syncOne(state, target, end);
        } catch (err) {
          if (errors.length < 10) errors.push(`${state.ticker}: ${err?.message || 'failed'}`);
          return null;
        }
      }),
    );
    const rows = [];
    for (const r of results) {
      if (!r) continue;
      if (!r.rows.length) empty += 1;
      else modes[r.mode] += 1;
      rows.push(...r.rows);
    }
    for (let j = 0; j < rows.length; j += UPSERT_CHUNK) {
      // eslint-disable-next-line no-await-in-loop
      const { error: upErr } = await admin
        .from('price_data_cache')
        .upsert(rows.slice(j, j + UPSERT_CHUNK), { onConflict: 'ticker,date' });
      if (upErr) {
        if (errors.length < 10) errors.push(`upsert: ${upErr.message}`);
      } else {
        stored += Math.min(UPSERT_CHUNK, rows.length - j);
      }
    }
  }

  return NextResponse.json({
    tickers: todo.length,
    ...modes,
    empty,
    skipped,
    stored,
    done: skipped === 0,
    ms: Date.now() - started,
    errors,
  });
}

export const GET = cronRoute('sync-quant-universe', run, { ttlSeconds: 360 });
