/**
 * Paid evaluation controls (Nov 28 2026). Pure decisions; the benchmark worker and the
 * admin route gather the state and obey the answer. Tested with mocked usage in
 * scripts/check-sonar-hardening.mjs.
 *
 * The Nov 28 benchmark spent $96.39 at list price and exhausted the account's API credit.
 * A suite in MODEL_BENCH_SUITES used to run as soon as a worker lane was scheduled; its
 * existence was enough. Now a paid evaluation step runs only when ALL of these hold:
 *
 *   1. the deployment allows paid evaluation calls at all:
 *        SONAR_BENCH_PAID_CALLS=authorized   (anything else, including unset, blocks)
 *        SONAR_BENCH_DISABLED=1 blocks everything, whatever else is set (kill switch)
 *   2. the suite carries an explicit authorization record:
 *        authorization: { by: '<who approved>', at: '<ISO date>', maxUsd: <n>, expiresAt }
 *      A suite without one never runs (every suite defined before this module has none).
 *   3. the suite and its authorization have not expired
 *   4. the suite has not been cancelled (a 'model-bench-cancel' row, written by the admin
 *      route's cancel action)
 *   5. per-suite spend: spent + reserved in flight + this step's estimate stays within
 *      min(suite.maxUsd, authorization.maxUsd)
 *   6. overall evaluation spend in the rolling window (all model-bench suites, 30 days):
 *      spent + reserved + estimate stays within SONAR_BENCH_GLOBAL_CAP_USD (default 0,
 *      which blocks)
 *   7. concurrency: fewer than maxConcurrent steps of the suite in flight
 *
 * Every step reserves its estimated cost before it starts (an attempt row carrying
 * reservedUsd); a reservation counts until its result row exists or it goes stale, so two
 * lanes cannot both spend the last dollars of a budget.
 */

export const BENCH_LIMITS = {
  windowDays: 30,
  reservationTtlMs: 10 * 60_000,
  defaultMaxConcurrent: 2,
};

/** Conservative list-price estimates per step (USD), reserved before the step runs. */
export const STEP_ESTIMATE_USD = {
  availability: 0.02,
  capture: 0.03,
  run_quick: 0.03,
  run_standard: 0.1,
  run_deep: 0.6,
  judge: 0.04,
  pair: 0.08,
};

export function estimateStepUsd(step) {
  if (!step) return STEP_ESTIMATE_USD.run_deep;
  if (step.kind === 'run')
    return STEP_ESTIMATE_USD[`run_${step.depth || 'deep'}`] ?? STEP_ESTIMATE_USD.run_deep;
  return STEP_ESTIMATE_USD[step.kind] ?? STEP_ESTIMATE_USD.run_deep;
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * May this paid step start? -> { ok: true, capUsd } | { ok: false, reason }
 * state: { suiteSpentUsd, suiteReservedUsd, globalSpentUsd, globalReservedUsd,
 *          inFlight, cancelled }
 */
export function paidStepGate({
  env = {},
  suite = {},
  state = {},
  estimateUsd = 0,
  now = Date.now(),
}) {
  if (env.SONAR_BENCH_DISABLED === '1' || env.SONAR_BENCH_DISABLED === 'true')
    return { ok: false, reason: 'disabled (SONAR_BENCH_DISABLED)' };
  if (env.SONAR_BENCH_PAID_CALLS !== 'authorized')
    return { ok: false, reason: 'paid evaluation calls are not authorized on this deployment' };
  const auth = suite.authorization;
  if (!auth?.by || !auth?.at || !(num(auth.maxUsd) > 0))
    return { ok: false, reason: 'suite has no explicit authorization (by, at, maxUsd)' };
  if (suite.until && now > Date.parse(suite.until)) return { ok: false, reason: 'expired' };
  if (auth.expiresAt && now > Date.parse(auth.expiresAt))
    return { ok: false, reason: 'authorization expired' };
  if (state.cancelled) return { ok: false, reason: 'cancelled' };
  const capUsd = Math.min(num(suite.maxUsd) || Infinity, num(auth.maxUsd));
  const suiteNext = num(state.suiteSpentUsd) + num(state.suiteReservedUsd) + num(estimateUsd);
  if (suiteNext > capUsd) return { ok: false, reason: 'spend cap', capUsd };
  const globalCap = num(env.SONAR_BENCH_GLOBAL_CAP_USD);
  const globalNext = num(state.globalSpentUsd) + num(state.globalReservedUsd) + num(estimateUsd);
  if (globalNext > globalCap)
    return {
      ok: false,
      reason: globalCap
        ? 'global evaluation spend cap'
        : 'global evaluation cap is 0 (SONAR_BENCH_GLOBAL_CAP_USD unset)',
    };
  const maxConc = num(suite.maxConcurrent) || BENCH_LIMITS.defaultMaxConcurrent;
  if (num(state.inFlight) >= maxConc) return { ok: false, reason: 'concurrency limit' };
  return { ok: true, capUsd };
}

/**
 * Spend, reservations and cancellation from a suite's rows (pure; rows as read by the
 * worker: { engine, created_at, key, usd, runUsd, reservedUsd }).
 */
export function suiteLedger(
  rows = [],
  { now = Date.now(), ttlMs = BENCH_LIMITS.reservationTtlMs } = {},
) {
  let spentUsd = 0;
  let cancelled = false;
  const results = new Set();
  const reservations = [];
  for (const r of rows) {
    if (r.engine === 'model-bench-cancel') cancelled = true;
    if (r.engine === 'model-bench-attempt') {
      reservations.push(r);
      continue;
    }
    spentUsd += num(r.runUsd) || num(r.usd);
    if (r.key) results.add(r.key);
  }
  let reservedUsd = 0;
  let inFlight = 0;
  for (const a of reservations) {
    const age = now - Date.parse(a.created_at);
    if (results.has(a.key) || !(age < ttlMs)) continue;
    reservedUsd += num(a.reservedUsd);
    inFlight += 1;
  }
  return { spentUsd, reservedUsd, inFlight, cancelled };
}
