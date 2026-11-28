/**
 * The model benchmark suites the cron worker runs unattended, in order (Nov 28 2026).
 * A suite is skipped once complete, past `until`, or at its `maxUsd` spend cap (runs
 * plus judging, at list price). To stop everything, move `until` into the past or
 * remove the cron entries in vercel.json.
 *
 *   model-bench-2026-11-28         the seven cases (complete)
 *   model-bench-2026-11-28-deep2   deep only, output caps x1.75 (benchmark only), three
 *                                  deep questions, four single-variable cells, 2 trials
 */
export const MODEL_BENCH_SUITES = [
  {
    suite: 'model-bench-2026-11-28',
    until: '2026-11-30T05:00:00Z',
    maxUsd: 60,
    deepTrials: 3,
    variant: null,
  },
  {
    suite: 'model-bench-2026-11-28-deep2',
    until: '2026-11-30T05:00:00Z',
    maxUsd: 45,
    deepTrials: 2,
    variant: 'deep-uncapped',
  },
];
export const MODEL_BENCH_LANES = 6;
/* The admin page's default suite. */
export const ACTIVE_MODEL_BENCH = { ...MODEL_BENCH_SUITES[0], lanes: MODEL_BENCH_LANES };
