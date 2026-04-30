/**
 * Server-only: math + helpers for ELO Pillar B (portfolio performance).
 */

export const PILLAR_B_LIFETIME_CAP = 3500;
export const REAL_MONEY_WEIGHT = 1.0;
export const MOCK_MONEY_WEIGHT = 0.4;

/**
 * @param {number} startValue
 * @param {number} endValue
 * @returns {number} percentage (e.g., 5.2 means +5.2%)
 */
export function computeReturnPct(startValue, endValue) {
  if (!startValue || startValue <= 0) return 0;
  return ((endValue - startValue) / startValue) * 100;
}

/**
 * @param {number[]} dailyReturnsPct
 * @returns {number|null}
 */
export function computeSharpe(dailyReturnsPct) {
  if (!Array.isArray(dailyReturnsPct) || dailyReturnsPct.length < 30) {
    return null;
  }
  const n = dailyReturnsPct.length;
  const mean = dailyReturnsPct.reduce((s, r) => s + r, 0) / n;
  const variance = dailyReturnsPct.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1);
  const stdev = Math.sqrt(variance);
  if (stdev === 0) return null;
  return (mean / stdev) * Math.sqrt(252);
}

/**
 * monthly_score = alpha_vs_spy (percent points) + sharpe * 50
 * @param {number} alphaVsSpyPct
 * @param {number|null} sharpe90d
 * @returns {number}
 */
export function computeMonthlyScore(alphaVsSpyPct, sharpe90d) {
  const alphaContribution = alphaVsSpyPct;
  const sharpeContribution = (sharpe90d || 0) * 50;
  return alphaContribution + sharpeContribution;
}

/**
 * @param {number} monthlyScore
 * @returns {number}
 */
export function eloDeltaForScore(monthlyScore) {
  if (!Number.isFinite(monthlyScore)) return 0;
  if (monthlyScore > 4) return 20;
  if (monthlyScore > 2) return 10;
  if (monthlyScore > 0) return 5;
  if (monthlyScore >= -2) return 0;
  if (monthlyScore >= -5) return -5;
  return -15;
}

/**
 * @param {number} rawDelta
 * @param {boolean} isReal
 * @returns {number}
 */
export function applyRealMockWeight(rawDelta, isReal) {
  const w = isReal ? REAL_MONEY_WEIGHT : MOCK_MONEY_WEIGHT;
  return Math.round(rawDelta * w);
}

/**
 * @param {number} weightedDelta
 * @param {number} currentLifetimeTotal
 * @returns {{ effectiveDelta: number, newLifetimeTotal: number }}
 */
export function applyLifetimeCap(weightedDelta, currentLifetimeTotal) {
  if (weightedDelta <= 0) {
    return { effectiveDelta: weightedDelta, newLifetimeTotal: currentLifetimeTotal };
  }

  const remaining = PILLAR_B_LIFETIME_CAP - currentLifetimeTotal;
  if (remaining <= 0) {
    return { effectiveDelta: 0, newLifetimeTotal: currentLifetimeTotal };
  }

  const allowed = Math.min(weightedDelta, remaining);
  return {
    effectiveDelta: allowed,
    newLifetimeTotal: currentLifetimeTotal + allowed,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {string} fromDateIso
 * @param {string} toDateIso
 * @param {boolean} forReal
 * @returns {Promise<number[]>}
 */
export async function fetchDailyReturnsForRange(supabase, userId, fromDateIso, toDateIso, forReal) {
  const valueColumn = forReal ? 'real_value' : 'mock_value';
  const { data: rows, error } = await supabase
    .from('portfolio_value_snapshots')
    .select(`snapshot_date, ${valueColumn}`)
    .eq('user_id', userId)
    .gte('snapshot_date', fromDateIso)
    .lte('snapshot_date', toDateIso)
    .order('snapshot_date', { ascending: true });

  if (error || !rows || rows.length < 2) return [];

  const returns = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = Number(rows[i - 1][valueColumn]);
    const curr = Number(rows[i][valueColumn]);
    if (prev > 0) {
      returns.push(((curr - prev) / prev) * 100);
    }
  }
  return returns;
}
