/**
 * The model benchmark suites the cron worker runs unattended, in order (Nov 28 2026).
 * A suite is skipped once complete, past `until`, or at its `maxUsd` spend cap (runs
 * plus judging, at list price). To stop everything, move `until` into the past or
 * remove the cron entries in vercel.json.
 *
 *   model-bench-2026-11-28         the seven cases (complete)
 *   model-bench-2026-11-28-deep2   deep only, output caps x1.75 (benchmark only), three
 *                                  deep questions, four single-variable cells, 2 trials (complete)
 *   model-bench-2026-11-28-profile-d   current vs D after the fixes, 17 cases
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
  /* Suite 3: current vs Profile D after the specialist budget and output-contract fixes;
     17 cases (the seven, the deep valuation, the ten proposed), deep in two trials. */
  /* Stopped at capture (14:40 UTC): the composition step failed for every case that has
     one (it read the route's { ok, value } wrapper). Superseded by profile-d2. */
  {
    suite: 'model-bench-2026-11-28-profile-d',
    until: '2026-11-28T14:40:00Z',
    maxUsd: 1,
    deepTrials: 2,
    variant: 'profile-d',
  },
  /* Stopped at 15:10 UTC: the 5.5 models think by default (Sonnet 5.5 at high effort) and
     max_tokens covers thinking plus text, so specialists and reviewers on 5.5 models were
     cut before writing any text. Superseded by profile-d3 once requests set thinking and
     effort per role. */
  {
    suite: 'model-bench-2026-11-28-profile-d2',
    until: '2026-11-28T15:10:00Z',
    maxUsd: 45,
    deepTrials: 2,
    variant: 'profile-d',
  },
  /* Suite 3 as run: current vs Profile D with role budgets, bounded contracts, the
     production composition and valuation frozen, and thinking/effort set per role. */
  /* Stopped at 15:35 UTC after 28 runs: specialists still spent their caps on extra fields
     their skill contracts list and the engine discards. Its frozen evidence is reused. */
  {
    suite: 'model-bench-2026-11-28-profile-d3',
    until: '2026-11-28T15:35:00Z',
    maxUsd: 45,
    deepTrials: 2,
    variant: 'profile-d',
  },
  /* Suite 3 as reported: d3's frozen evidence, specialists return only the fields Sonar reads. */
  {
    suite: 'model-bench-2026-11-28-profile-d4',
    until: '2026-11-30T05:00:00Z',
    maxUsd: 40,
    deepTrials: 2,
    variant: 'profile-d',
    snapshotsFrom: 'model-bench-2026-11-28-profile-d3',
  },
  /* Suite 4 (Sonar 6.4 hardening): evidence contract and the Sonnet 5.5 standard writer
     candidate on frozen evidence, standard cases only. Runs after profile-d4. */
  {
    suite: 'model-bench-2026-11-28-contract',
    until: '2026-11-30T05:00:00Z',
    maxUsd: 15,
    deepTrials: 1,
    variant: 'contract',
    snapshotsFrom: 'model-bench-2026-11-28-profile-d3',
  },
  /* Stopped: launched before its variant was defined, so it ran the default seven-case plan
     on d3's evidence. Not a DCF confirmation; excluded from the report. */
  {
    suite: 'model-bench-2026-11-28-profile-d-dcf',
    until: '2026-11-28T16:40:00Z',
    maxUsd: 8,
    deepTrials: 1,
    variant: 'profile-d-dcf',
    snapshotsFrom: 'model-bench-2026-11-28-profile-d3',
  },
  /* Cancelled before it ran (API credits exhausted); kept so no lane can start it. */
  {
    suite: 'model-bench-2026-11-28-profile-d-dcf2',
    until: '2026-11-28T16:45:00Z',
    maxUsd: 0,
    deepTrials: 2,
    variant: 'profile-d-dcf',
    snapshotsFrom: 'model-bench-2026-11-28-profile-d3',
  },
];
export const MODEL_BENCH_LANES = 6;
/* The admin page's default suite. */
/* Pinned to profile-d4 while it runs (the contract suite was appended after it). */
export const ACTIVE_MODEL_BENCH = {
  ...(MODEL_BENCH_SUITES.find((s) => s.suite === 'model-bench-2026-11-28-profile-d4') ||
    MODEL_BENCH_SUITES[MODEL_BENCH_SUITES.length - 1]),
  lanes: MODEL_BENCH_LANES,
};
