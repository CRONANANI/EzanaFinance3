/**
 * The model benchmark suite the cron worker runs unattended (Nov 28 2026). The worker
 * does nothing after `until` or once `maxUsd` is spent in the suite (runs plus judging,
 * at list price). To run a new suite, change `suite`; to stop, move `until` into the past
 * or remove the cron entries in vercel.json.
 */
export const ACTIVE_MODEL_BENCH = {
  suite: 'model-bench-2026-11-28',
  until: '2026-11-30T05:00:00Z',
  maxUsd: 60,
  deepTrials: 3,
  lanes: 6,
};
