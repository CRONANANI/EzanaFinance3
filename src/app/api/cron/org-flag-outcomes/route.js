import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { FmpAPI } from '@/lib/services/fmp';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Score a flag at its 90-day horizon (or position exit, when that is tracked).
const HORIZON_DAYS = 90;
const CONVICTION_WEIGHT = { low: 1, med: 1.5, high: 2 };

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

/** Nearest daily close at or before a target date; falls back to the closest bar. */
function closeAt(bars, targetMs) {
  if (!Array.isArray(bars) || bars.length === 0) return null;
  let best = null;
  let bestDelta = Infinity;
  let bestAtOrBefore = null;
  for (const bar of bars) {
    const t = new Date(bar.date).getTime();
    if (!Number.isFinite(t) || bar.close == null) continue;
    const delta = Math.abs(t - targetMs);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = bar.close;
    }
    if (t <= targetMs && (bestAtOrBefore == null || t > bestAtOrBefore.t)) {
      bestAtOrBefore = { t, close: bar.close };
    }
  }
  return bestAtOrBefore ? bestAtOrBefore.close : best;
}

function latestClose(bars) {
  if (!Array.isArray(bars) || bars.length === 0) return null;
  let latest = null;
  for (const bar of bars) {
    const t = new Date(bar.date).getTime();
    if (!Number.isFinite(t) || bar.close == null) continue;
    if (!latest || t > latest.t) latest = { t, close: bar.close };
  }
  return latest?.close ?? null;
}

async function run(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let supabase;
  try {
    supabase = getAdminClient();
  } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  const horizonCutoff = new Date(Date.now() - HORIZON_DAYS * 86400000).toISOString();

  // Candidates: flags at/past their 90d horizon with no outcome scored yet.
  const { data: flags, error } = await supabase
    .from('org_position_flags')
    .select(
      'id, org_id, ticker, flag_color, conviction, benchmark_symbol, position_current_price, created_at',
    )
    .lte('created_at', horizonCutoff)
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!flags?.length) return NextResponse.json({ scored: 0 });

  const { data: existing } = await supabase
    .from('org_flag_outcome')
    .select('flag_id')
    .in(
      'flag_id',
      flags.map((f) => f.id),
    );
  const alreadyScored = new Set((existing || []).map((o) => o.flag_id));

  const priceCache = new Map();
  const getBars = async (symbol) => {
    if (!symbol) return null;
    if (priceCache.has(symbol)) return priceCache.get(symbol);
    let bars = null;
    try {
      bars = await FmpAPI.getHistoricalPrice(symbol);
    } catch {
      bars = null;
    }
    priceCache.set(symbol, bars);
    return bars;
  };

  const rows = [];
  for (const flag of flags) {
    if (alreadyScored.has(flag.id)) continue;

    const flagMs = new Date(flag.created_at).getTime();
    const horizonMs = flagMs + HORIZON_DAYS * 86400000;
    const horizonDate = new Date(horizonMs).toISOString().slice(0, 10);

    const tickerBars = await getBars(flag.ticker);
    // Entry price: prefer the price we snapshotted when the flag was raised;
    // fall back to the historical close on the flag date.
    const entry =
      flag.position_current_price != null
        ? Number(flag.position_current_price)
        : closeAt(tickerBars, flagMs);
    const horizonPrice = closeAt(tickerBars, horizonMs) ?? latestClose(tickerBars);

    let positionReturn = null;
    if (entry && horizonPrice && entry > 0) {
      positionReturn = ((horizonPrice - entry) / entry) * 100;
    }

    let benchmarkReturn = null;
    if (flag.benchmark_symbol) {
      const benchBars = await getBars(flag.benchmark_symbol);
      const benchEntry = closeAt(benchBars, flagMs);
      const benchHorizon = closeAt(benchBars, horizonMs) ?? latestClose(benchBars);
      if (benchEntry && benchHorizon && benchEntry > 0) {
        benchmarkReturn = ((benchHorizon - benchEntry) / benchEntry) * 100;
      }
    }

    // Excess vs the sector benchmark. Only then can we judge correctness.
    let excess = null;
    let wasCorrect = null;
    if (positionReturn != null && benchmarkReturn != null) {
      excess = positionReturn - benchmarkReturn;
      // Green flag correct ⇔ outperformed; Red flag correct ⇔ underperformed.
      wasCorrect = flag.flag_color === 'green' ? excess > 0 : excess < 0;
    }

    const convictionWeight = CONVICTION_WEIGHT[flag.conviction] ?? 1;
    const score = wasCorrect == null ? null : (wasCorrect ? 1 : -1) * convictionWeight;

    rows.push({
      flag_id: flag.id,
      org_id: flag.org_id,
      horizon_date: horizonDate,
      position_return: positionReturn,
      benchmark_return: benchmarkReturn,
      excess,
      was_correct: wasCorrect,
      conviction_weight: convictionWeight,
      score,
    });
  }

  if (!rows.length) return NextResponse.json({ scored: 0 });

  const { error: upsertErr } = await supabase
    .from('org_flag_outcome')
    .upsert(rows, { onConflict: 'flag_id' });
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  return NextResponse.json({ scored: rows.length });
}

export async function GET(request) {
  return run(request);
}
export async function POST(request) {
  return run(request);
}
