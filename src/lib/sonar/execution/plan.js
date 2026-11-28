/**
 * Sonar 6.5: requirements (or a Research Composer screen attachment) to a typed dependency
 * graph (Nov 28 2026).
 *
 * The graph generalizes the 6.4 stage chain (composer/stages.js): a universe step, one read
 * step per condition source in the order the question states them, each depending on the
 * step before it and reading its candidate set (passing or still unknown, never only the
 * passing ones, so a missing value cannot silently remove a company), then one combine step
 * that applies the three-valued conjunction, and an optional rank step. Automatically
 * inferred plans and manually attached Composer screens produce the same graph, because both
 * arrive as the same filters.
 *
 * The production screen executor (analytics-server.js runScreen) runs this shape with its
 * existing readers; tests run it with fixture readers through executePlan.
 * Pure; unit-tested in scripts/check-sonar-6-5.mjs.
 */
import { SCREEN_MEASURES } from '../composer/screen.js';

const SEEDABLE = new Set(['congress', 'insider', 'contracts_window']);

/**
 * @param input  { universe: { kind, id?, tickers?, orgId? }, filters: [{ metric, op, value? }],
 *                 rankBy?, requirements? }
 * -> { objective, steps, unsupported: [requirement ids] }
 */
export function planScreen(input = {}) {
  const filters = (input.filters || []).filter((f) => SCREEN_MEASURES[f.metric]);
  const unsupported = (input.requirements || [])
    .filter((r) => r.kind === 'condition' && (!r.metric || r.resolution === 'unsupported'))
    .map((r) => r.id);
  const u = input.universe || { kind: 'unspecified' };
  const steps = [];
  let seedSource = null;
  if (u.kind === 'tickers' || u.kind === 'org_holdings' || u.kind === 'sector')
    steps.push({
      id: 'universe',
      operation:
        u.kind === 'sector'
          ? 'resolve_sector_universe'
          : u.kind === 'org_holdings'
            ? 'read_org_holdings'
            : 'named_universe',
      dependsOn: [],
      output: 'security_universe',
      datasets: u.kind === 'org_holdings' ? ['org_positions'] : ['ticker_sectors'],
      entityScope: u,
    });
  else {
    const seed = filters.find(
      (f) => SEEDABLE.has(SCREEN_MEASURES[f.metric].source) && (f.op === 'exists' || f.op === '>'),
    );
    if (seed) {
      seedSource = SCREEN_MEASURES[seed.metric].source;
      steps.push({
        id: 'universe',
        operation: 'seed_from_records',
        dependsOn: [],
        output: 'security_universe',
        datasets: [seedSource],
        entityScope: { kind: 'seed', source: seedSource },
      });
    } else
      steps.push({
        id: 'universe',
        operation: 'unresolved_universe',
        dependsOn: [],
        output: 'security_universe',
        datasets: [],
        entityScope: { kind: 'unspecified' },
      });
  }
  /* Group conditions by source; cheap filed figures first, 13F last (the costliest read). */
  const order = (src) =>
    src === 'ratios' ? 0 : src === 'holders13f' || src === 'holders13f_change' ? 2 : 1;
  const sources = [...new Set(filters.map((f) => SCREEN_MEASURES[f.metric].source))].sort(
    (a, b) => order(a) - order(b),
  );
  let prev = 'universe';
  let prevOut = 'security_universe';
  for (const src of sources) {
    const id = `read:${src}`;
    steps.push({
      id,
      operation: 'evaluate_conditions',
      dependsOn: [prev],
      input: `${prev}.${prevOut}`,
      output: 'candidates',
      datasets: [src],
      conditions: filters.filter((f) => SCREEN_MEASURES[f.metric].source === src),
      key: `read:${src}`,
      success: 'every candidate evaluated or marked unknown',
      onFailure: 'continue',
      reusesSeed: src === seedSource,
    });
    prev = id;
    prevOut = 'candidates';
  }
  steps.push({
    id: 'combine',
    operation: 'combine',
    dependsOn: steps
      .filter((s) => s.id !== 'universe')
      .map((s) => s.id)
      .concat(sources.length ? [] : ['universe']),
    output: 'verified_results',
    optional: false,
  });
  if (input.rankBy && SCREEN_MEASURES[input.rankBy])
    steps.push({
      id: 'rank',
      operation: 'rank',
      dependsOn: ['combine'],
      input: 'combine.verified_results',
      output: 'ranked_results',
      measure: input.rankBy,
    });
  return { objective: 'multi_condition_screen', steps, unsupported };
}
