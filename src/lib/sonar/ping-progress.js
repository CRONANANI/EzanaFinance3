/**
 * What the Sonar ping loader shows at a point in a sweep (SonarPingLoader,
 * Nov 2). Pure, so the honesty rule is testable: the ping is one request
 * with no per-dimension events, so the status line walks the dimension
 * names on a 2.1s timer and the dots fill with it, but the last dot never
 * fills and the line holds on "Writing your briefing" until the answer
 * lands. Only the 'ready' phase shows every dot done.
 */

/** One timer step: one dimension name, the ring's rhythm. */
export const STEP_MS = 2100;

/**
 * @param {Array<{ id: string, name: string }>} dimensions in sweep order
 * @param {number} step timer steps since the sweep began
 * @param {'sweeping' | 'ready' | 'error'} phase
 * @returns {{ dots: Array<'done' | 'sweeping' | 'queued'>, done: number, status: string }}
 */
export function sweepView(dimensions, step, phase) {
  const n = dimensions.length;
  if (phase === 'ready') {
    return { dots: dimensions.map(() => 'done'), done: n, status: 'Briefing ready' };
  }
  if (phase === 'error') {
    return {
      dots: dimensions.map(() => 'queued'),
      done: 0,
      status: 'Sonar couldn’t finish this ping',
    };
  }
  const at = Math.max(0, Math.min(step, n - 1));
  const dots = dimensions.map((_, i) => (i < at ? 'done' : i === at ? 'sweeping' : 'queued'));
  return {
    dots,
    done: at,
    status: step < n ? dimensions[Math.max(0, step)].name : 'Writing your briefing',
  };
}
