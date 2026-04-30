import { NextResponse } from 'next/server';
import { createServerSupabaseClient, isServerSupabaseConfigured } from '@/lib/supabase-service-role';
import { awardELO } from '@/lib/elo';
import {
  computeReturnPct,
  computeSharpe,
  computeMonthlyScore,
  eloDeltaForScore,
  applyRealMockWeight,
  applyLifetimeCap,
  fetchDailyReturnsForRange,
} from '@/lib/elo-portfolio-perf';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const FMP_KEY = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY;
const FMP_BASE = 'https://financialmodelingprep.com/stable';

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

function getPriorMonthRange(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const priorMonthStart = new Date(year, month - 1, 1);
  const priorMonthEnd = new Date(year, month, 0);
  return {
    year: priorMonthStart.getFullYear(),
    month: priorMonthStart.getMonth() + 1,
    startIso: priorMonthStart.toISOString().slice(0, 10),
    endIso: priorMonthEnd.toISOString().slice(0, 10),
  };
}

async function fetchSpyReturn(fromIso, toIso) {
  if (!FMP_KEY) return 0;
  try {
    const url = `${FMP_BASE}/historical-price-eod/full?symbol=SPY&from=${fromIso}&to=${toIso}&apikey=${encodeURIComponent(FMP_KEY)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return 0;
    const data = await res.json();
    const series = Array.isArray(data) ? data : data?.historical || [];
    const bars = series
      .filter((b) => b?.date && b.close != null)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (bars.length < 2) return 0;
    const oldest = Number(bars[0].close);
    const newest = Number(bars[bars.length - 1].close);
    if (!oldest || oldest <= 0) return 0;
    return ((newest - oldest) / oldest) * 100;
  } catch (e) {
    console.error('[monthly-elo] SPY fetch failed:', e);
    return 0;
  }
}

/**
 * After monthly perf rows exist, stamp each active copy with the target's return % for that month
 * (prefer real brokerage row, else mock).
 */
async function refreshActiveCopiesPerformance(supabase, year, month) {
  const { data: actives } = await supabase
    .from('active_copies')
    .select('id, target_user_id')
    .eq('is_active', true);

  if (!actives?.length) return { activeCopiesUpdated: 0 };

  const targetIds = [...new Set(actives.map((a) => a.target_user_id))];
  const { data: perfRows } = await supabase
    .from('monthly_portfolio_perf')
    .select('user_id, is_real_brokerage, return_pct')
    .eq('year', year)
    .eq('month', month)
    .in('user_id', targetIds);

  /** @type {Map<string, { real?: number; mock?: number }>} */
  const perfMap = new Map();
  for (const p of perfRows || []) {
    let e = perfMap.get(p.user_id);
    if (!e) {
      e = {};
      perfMap.set(p.user_id, e);
    }
    const r = Number(p.return_pct);
    if (p.is_real_brokerage) e.real = r;
    else e.mock = r;
  }

  const now = new Date().toISOString();
  let updated = 0;
  for (const row of actives) {
    const e = perfMap.get(row.target_user_id);
    const perfPct = Number.isFinite(e?.real) ? e.real : Number.isFinite(e?.mock) ? e.mock : null;
    if (perfPct == null) continue;

    const { error } = await supabase
      .from('active_copies')
      .update({ performance_pct: perfPct, performance_updated_at: now })
      .eq('id', row.id);
    if (!error) updated++;
  }

  return { activeCopiesUpdated: updated };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {{ year: number; month: number; startIso: string; endIso: string }} dateRange
 * @param {number} spyReturn
 * @param {boolean} isReal
 * @returns {Promise<{ outcome: string; reason?: string; eloAwarded?: number }>}
 */
async function processOnePortfolioType(supabase, userId, dateRange, spyReturn, isReal) {
  const valueColumn = isReal ? 'real_value' : 'mock_value';

  const { data: existingPerf } = await supabase
    .from('monthly_portfolio_perf')
    .select('id')
    .eq('user_id', userId)
    .eq('year', dateRange.year)
    .eq('month', dateRange.month)
    .eq('is_real_brokerage', isReal)
    .maybeSingle();

  if (existingPerf) {
    return { outcome: 'skipped', reason: 'already_recorded' };
  }

  const { data: snapshots } = await supabase
    .from('portfolio_value_snapshots')
    .select(`snapshot_date, ${valueColumn}`)
    .eq('user_id', userId)
    .gte('snapshot_date', dateRange.startIso)
    .lte('snapshot_date', dateRange.endIso)
    .order('snapshot_date', { ascending: true });

  if (!snapshots || snapshots.length < 2) {
    return { outcome: 'skipped', reason: 'insufficient_snapshots' };
  }

  const startSnap = snapshots[0];
  const endSnap = snapshots[snapshots.length - 1];
  const startValue = Number(startSnap[valueColumn]) || 0;
  const endValue = Number(endSnap[valueColumn]) || 0;

  if (startValue <= 0) {
    return { outcome: 'skipped', reason: 'zero_start_value' };
  }

  const returnPct = computeReturnPct(startValue, endValue);
  const alphaVsSpy = returnPct - spyReturn;

  const endAnchor = new Date(`${dateRange.endIso}T12:00:00Z`);
  endAnchor.setUTCDate(endAnchor.getUTCDate() - 90);
  const sharpeFromIso = endAnchor.toISOString().slice(0, 10);

  const dailyReturns = await fetchDailyReturnsForRange(
    supabase,
    userId,
    sharpeFromIso,
    dateRange.endIso,
    isReal
  );
  const sharpe90d = computeSharpe(dailyReturns);

  const monthlyScore = computeMonthlyScore(alphaVsSpy, sharpe90d);
  const rawDelta = eloDeltaForScore(monthlyScore);
  const weightedDelta = applyRealMockWeight(rawDelta, isReal);

  let eloAwarded = 0;
  let newLifetimeTotal = null;
  let currentLifetime = 0;

  if (weightedDelta < 0) {
    eloAwarded = weightedDelta;
  } else if (weightedDelta > 0) {
    const { data: eloRow } = await supabase
      .from('user_elo')
      .select('lifetime_pillar_b_awarded')
      .eq('user_id', userId)
      .maybeSingle();

    currentLifetime = eloRow?.lifetime_pillar_b_awarded || 0;
    const capResult = applyLifetimeCap(weightedDelta, currentLifetime);
    eloAwarded = capResult.effectiveDelta;
    newLifetimeTotal = capResult.newLifetimeTotal;
  }

  const reason = isReal
    ? `Real portfolio ${dateRange.year}-${String(dateRange.month).padStart(2, '0')} performance`
    : `Mock portfolio ${dateRange.year}-${String(dateRange.month).padStart(2, '0')} performance`;

  const meta = {
    year: dateRange.year,
    month: dateRange.month,
    isReal,
    returnPct: Number(returnPct.toFixed(4)),
    alphaVsSpy: Number(alphaVsSpy.toFixed(4)),
    sharpe90d: sharpe90d != null ? Number(sharpe90d.toFixed(4)) : null,
    monthlyScore: Number(monthlyScore.toFixed(4)),
  };

  const { data: inserted, error: insErr } = await supabase
    .from('monthly_portfolio_perf')
    .insert({
      user_id: userId,
      year: dateRange.year,
      month: dateRange.month,
      is_real_brokerage: isReal,
      start_value: startValue,
      end_value: endValue,
      return_pct: Number(returnPct.toFixed(4)),
      spy_return_pct: Number(spyReturn.toFixed(4)),
      alpha_vs_spy: Number(alphaVsSpy.toFixed(4)),
      sharpe_90d: sharpe90d != null ? Number(sharpe90d.toFixed(4)) : null,
      monthly_score: Number(monthlyScore.toFixed(4)),
      elo_awarded: eloAwarded,
    })
    .select('id')
    .single();

  if (insErr) {
    console.error('[monthly-elo] insert monthly_portfolio_perf failed:', insErr);
    return { outcome: 'error', reason: insErr.message };
  }

  if (eloAwarded !== 0) {
    const awardResult = await awardELO(userId, eloAwarded, reason, 'portfolio', meta);
    if (!awardResult) {
      await supabase.from('monthly_portfolio_perf').delete().eq('id', inserted.id);
      return { outcome: 'error', reason: 'awardELO_failed' };
    }
  }

  if (eloAwarded > 0 && newLifetimeTotal != null && newLifetimeTotal > currentLifetime) {
    await supabase
      .from('user_elo')
      .update({ lifetime_pillar_b_awarded: newLifetimeTotal })
      .eq('user_id', userId);
  }

  return { outcome: 'computed', eloAwarded };
}

async function run(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  const supabase = createServerSupabaseClient();
  const dateRange = getPriorMonthRange();
  const spyReturn = await fetchSpyReturn(dateRange.startIso, dateRange.endIso);

  const { data: usersWithSnapshots } = await supabase
    .from('portfolio_value_snapshots')
    .select('user_id')
    .gte('snapshot_date', dateRange.startIso)
    .lte('snapshot_date', dateRange.endIso);

  const uniqueUsers = [...new Set((usersWithSnapshots || []).map((r) => r.user_id))];

  let processed = 0;
  let realComputed = 0;
  let mockComputed = 0;
  let totalEloAwarded = 0;
  const errors = [];

  for (const userId of uniqueUsers) {
    try {
      const realResult = await processOnePortfolioType(supabase, userId, dateRange, spyReturn, true);
      if (realResult.outcome === 'computed') {
        realComputed++;
        totalEloAwarded += realResult.eloAwarded || 0;
      } else if (realResult.outcome === 'error') {
        errors.push({ userId, kind: 'real', error: realResult.reason });
      }

      const mockResult = await processOnePortfolioType(supabase, userId, dateRange, spyReturn, false);
      if (mockResult.outcome === 'computed') {
        mockComputed++;
        totalEloAwarded += mockResult.eloAwarded || 0;
      } else if (mockResult.outcome === 'error') {
        errors.push({ userId, kind: 'mock', error: mockResult.reason });
      }

      processed++;
    } catch (e) {
      errors.push({ userId, error: e instanceof Error ? e.message : String(e) });
    }
  }

  const copies = await refreshActiveCopiesPerformance(supabase, dateRange.year, dateRange.month);

  return NextResponse.json({
    success: true,
    dateRange,
    spyReturn: Number(spyReturn.toFixed(4)),
    processedUsers: processed,
    realPortfoliosScored: realComputed,
    mockPortfoliosScored: mockComputed,
    totalEloAwarded,
    activeCopiesUpdated: copies.activeCopiesUpdated,
    errors: errors.slice(0, 10),
  });
}

export async function GET(request) {
  return run(request);
}

export async function POST(request) {
  return run(request);
}
