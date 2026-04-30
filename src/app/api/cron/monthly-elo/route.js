/**
 * Fetches SPY benchmark, scores portfolio snapshots → monthly_portfolio_perf + ELO.
 *
 * Monthly ELO Cron — runs on the 1st of each month at 02:00 UTC.
 *
 * Two phases run in sequence:
 *
 *   Phase 1 — Pillar B (Portfolio Performance):
 *     For every user with snapshots in the prior month, computes return,
 *     Sharpe, alpha vs SPY, applies real/mock weights, applies the lifetime
 *     cap, awards ELO, records monthly_portfolio_perf row.
 *
 *   Phase 2 — Pillar C Ongoing (Being Copied):
 *     Scans active_copies for relationships that overlapped the prior month.
 *     For each target user, awards +20 per active copier (base) plus
 *     profitability bonus/penalty (+10 if score > 0, -5 if score < -2).
 *     Annual cap +500 on positive Pillar-C-ongoing awards. Updates
 *     active_copies.performance_pct so copiers see how the strategy did.
 *
 * Phase 2 reads from monthly_portfolio_perf — that's why it runs SECOND
 * after Phase 1 inserts those rows.
 */
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
  activeCopyDeltaForTarget,
  applyPillarCOngoingCap,
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
 * Phase 2: active-copy awards + performance_pct on copy rows.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ year: number; month: number; startIso: string; endIso: string }} dateRange
 */
async function processActiveCopiesPhase(supabase, dateRange) {
  const result = {
    activeCopiesScanned: 0,
    targetsAwarded: 0,
    totalEloAwarded: 0,
    skippedNoTargetPerf: 0,
    skippedAtCap: 0,
    performancePctsUpdated: 0,
    errors: [],
  };

  const orFilter = `is_active.eq.true,stopped_at.gte.${dateRange.startIso}`;
  const { data: copies, error: copiesErr } = await supabase
    .from('active_copies')
    .select('id, copier_id, target_user_id, started_at, stopped_at, is_active')
    .or(orFilter);

  if (copiesErr) {
    result.errors.push({ phase: 'fetch active_copies', error: copiesErr.message });
    return result;
  }

  result.activeCopiesScanned = copies?.length || 0;
  if (!copies || copies.length === 0) return result;

  const monthStart = new Date(`${dateRange.startIso}T00:00:00.000Z`);
  const monthEnd = new Date(`${dateRange.endIso}T23:59:59.999Z`);

  const overlappedCopies = copies.filter((c) => {
    const startedDate = new Date(c.started_at);
    const stoppedDate = c.stopped_at ? new Date(c.stopped_at) : null;
    if (startedDate > monthEnd) return false;
    if (stoppedDate && stoppedDate < monthStart) return false;
    return true;
  });

  const copiesByTarget = new Map();
  for (const c of overlappedCopies) {
    if (!copiesByTarget.has(c.target_user_id)) {
      copiesByTarget.set(c.target_user_id, []);
    }
    copiesByTarget.get(c.target_user_id).push(c);
  }

  const yearStart = new Date(dateRange.year, 0, 1).toISOString();
  const ymPrefix = `${dateRange.year}-${String(dateRange.month).padStart(2, '0')}`;

  for (const [targetUserId, targetCopies] of copiesByTarget.entries()) {
    try {
      const copierCount = targetCopies.length;

      const { data: perfRows } = await supabase
        .from('monthly_portfolio_perf')
        .select('is_real_brokerage, monthly_score, return_pct')
        .eq('user_id', targetUserId)
        .eq('year', dateRange.year)
        .eq('month', dateRange.month);

      if (!perfRows || perfRows.length === 0) {
        result.skippedNoTargetPerf++;
        const nowIso = new Date().toISOString();
        for (const copy of targetCopies) {
          const { error } = await supabase
            .from('active_copies')
            .update({ performance_pct: null, performance_updated_at: nowIso })
            .eq('id', copy.id);
          if (!error) result.performancePctsUpdated++;
        }
        continue;
      }

      const realRow = perfRows.find((r) => r.is_real_brokerage === true);
      const canonicalRow = realRow || perfRows[0];

      const monthlyScore = Number(canonicalRow.monthly_score);
      const monthlyReturnPct = Number(canonicalRow.return_pct);
      const scoreForDelta = Number.isFinite(monthlyScore) ? monthlyScore : 0;

      const { baseDelta, profitabilityDelta, totalDelta } = activeCopyDeltaForTarget(
        copierCount,
        scoreForDelta
      );

      const { data: ytdAwards } = await supabase
        .from('elo_transactions')
        .select('delta')
        .eq('user_id', targetUserId)
        .eq('category', 'social')
        .like('reason', 'Active copiers%')
        .gte('created_at', yearStart);

      const ytdPositive = (ytdAwards || [])
        .filter((t) => t.delta > 0)
        .reduce((sum, t) => sum + (t.delta || 0), 0);

      const { effectiveDelta } = applyPillarCOngoingCap(totalDelta, ytdPositive);

      if (effectiveDelta !== 0) {
        const reasonStr = `Active copiers ${ymPrefix}: ${copierCount} copier${copierCount > 1 ? 's' : ''}`;
        const awardResult = await awardELO(targetUserId, effectiveDelta, reasonStr, 'social', {
          year: dateRange.year,
          month: dateRange.month,
          copier_count: copierCount,
          target_monthly_score: Number(scoreForDelta.toFixed(4)),
          base_delta: baseDelta,
          profitability_delta: profitabilityDelta,
          total_delta_raw: totalDelta,
          effective_delta: effectiveDelta,
          capped: totalDelta > 0 && effectiveDelta < totalDelta,
        });
        if (awardResult) {
          result.targetsAwarded++;
          result.totalEloAwarded += effectiveDelta;
        } else {
          result.errors.push({
            targetUserId,
            phase: 'awardELO',
            reason: reasonStr,
          });
        }
      } else if (totalDelta > 0) {
        result.skippedAtCap++;
      }

      const nowIso = new Date().toISOString();
      for (const copy of targetCopies) {
        const payload =
          Number.isFinite(monthlyReturnPct) ?
            { performance_pct: monthlyReturnPct, performance_updated_at: nowIso }
          : { performance_pct: null, performance_updated_at: nowIso };

        const { error } = await supabase.from('active_copies').update(payload).eq('id', copy.id);
        if (!error) result.performancePctsUpdated++;
      }
    } catch (e) {
      result.errors.push({
        targetUserId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return result;
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

  const phase2 = await processActiveCopiesPhase(supabase, dateRange);

  return NextResponse.json({
    success: true,
    dateRange,
    spyReturn: Number(spyReturn.toFixed(4)),
    phase1: {
      processed,
      realPortfoliosScored: realComputed,
      mockPortfoliosScored: mockComputed,
      totalEloAwarded,
      errors: errors.slice(0, 10),
    },
    phase2: {
      activeCopiesScanned: phase2.activeCopiesScanned,
      targetsAwarded: phase2.targetsAwarded,
      totalEloAwarded: phase2.totalEloAwarded,
      skippedNoTargetPerf: phase2.skippedNoTargetPerf,
      skippedAtCap: phase2.skippedAtCap,
      performancePctsUpdated: phase2.performancePctsUpdated,
      errors: phase2.errors.slice(0, 10),
    },
  });
}

export async function GET(request) {
  return run(request);
}

export async function POST(request) {
  return run(request);
}
