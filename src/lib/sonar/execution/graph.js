/**
 * Sonar 6.5: the typed research dependency graph (Nov 28 2026).
 *
 * A complex question becomes a plan of steps; each step names its operation, the upstream
 * steps it needs, the input it reads from them, the datasets it touches and the output it
 * promises. The executor runs the plan with the existing Sonar executors (it never calls a
 * model):
 *
 *   validatePlan(plan)       unique ids, known dependencies, every input reference resolvable
 *                            to an upstream output, no cycles, a bounded number of steps
 *   executePlan(plan, ops)   dependency order; independent steps run concurrently up to a
 *                            bound; a step whose required input is not usable is recorded as
 *                            skipped_dependency (never run on an empty set); a step that
 *                            throws is a provider_error and its independent siblings keep
 *                            their results; cancellation and the run deadline stop new steps
 *                            (cancelled); identical reads are shared (dedupe key)
 *
 * No replanning, no recursion: the plan is fixed before execution.
 *
 * Step:
 *   { id, operation, objective?, dependsOn: [], input?: 'step.output', optional?: false,
 *     datasets: [], entityScope?, reportingPeriod?, output, success?, onFailure?: 'stop'|'continue',
 *     key?: string (dedupe key for identical reads) }
 */
import { stepResult, notExecuted, USABLE } from './envelope.js';

export const MAX_STEPS = 24;
export const DEFAULT_CONCURRENCY = 3;

/** -> { ok, errors: string[], order: string[] } */
export function validatePlan(plan) {
  const errors = [];
  const steps = plan?.steps || [];
  if (!steps.length) errors.push('the plan has no steps');
  if (steps.length > MAX_STEPS)
    errors.push(`the plan has ${steps.length} steps; the bound is ${MAX_STEPS}`);
  const byId = new Map();
  for (const s of steps) {
    if (!s?.id || !s.operation) errors.push('every step needs an id and an operation');
    else if (byId.has(s.id)) errors.push(`duplicate step id ${s.id}`);
    else byId.set(s.id, s);
  }
  for (const s of steps) {
    for (const d of s.dependsOn || [])
      if (!byId.has(d)) errors.push(`${s.id} depends on unknown step ${d}`);
    if (s.input) {
      const [from, out] = String(s.input).split('.');
      const up = byId.get(from);
      if (!up) errors.push(`${s.id} reads ${s.input} from an unknown step`);
      else if (!(s.dependsOn || []).includes(from))
        errors.push(`${s.id} reads ${s.input} without depending on ${from}`);
      else if (up.output !== out)
        errors.push(`${s.id} reads ${out} but ${from} outputs ${up.output || 'nothing'}`);
    }
  }
  /* Kahn's algorithm: an order exists exactly when there is no cycle. */
  const indeg = new Map(
    steps.map((s) => [s.id, (s.dependsOn || []).filter((d) => byId.has(d)).length]),
  );
  const queue = steps.filter((s) => indeg.get(s.id) === 0).map((s) => s.id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const s of steps)
      if ((s.dependsOn || []).includes(id)) {
        indeg.set(s.id, indeg.get(s.id) - 1);
        if (indeg.get(s.id) === 0) queue.push(s.id);
      }
  }
  if (order.length !== byId.size)
    errors.push(
      `cyclic dependency among: ${[...byId.keys()].filter((k) => !order.includes(k)).join(', ')}`,
    );
  return { ok: errors.length === 0, errors, order };
}

/**
 * Execute a validated plan.
 * @param plan  { objective, steps }
 * @param ops   { [operation]: async (step, inputs, ctx) => stepResult }
 * @param opts  { concurrency, signal, deadlineAt, now: () => ms, cache: Map }
 * -> { ok, results: { [id]: stepResult }, order, telemetry }
 */
export async function executePlan(
  plan,
  ops,
  {
    concurrency = DEFAULT_CONCURRENCY,
    signal = null,
    deadlineAt = null,
    now = () => Date.now(),
    cache = new Map(),
  } = {},
) {
  const v = validatePlan(plan);
  if (!v.ok) return { ok: false, errors: v.errors, results: {}, order: [], telemetry: null };
  const steps = new Map(plan.steps.map((s) => [s.id, s]));
  const results = {};
  const started = now();
  const tele = {
    steps: plan.steps.length,
    run: 0,
    skipped: 0,
    failed: 0,
    cancelled: 0,
    cacheHits: 0,
    maxParallel: 0,
  };
  const pending = new Set(v.order);
  const running = new Map();

  const ready = (id) => (steps.get(id).dependsOn || []).every((d) => results[d]);
  const blockedBy = (s) =>
    (s.dependsOn || [])
      .map((d) => results[d])
      .find((r) => r && !USABLE.has(r.status) && !steps.get(s.id).optional);

  const runOne = async (id) => {
    const s = steps.get(id);
    const inputs = Object.fromEntries((s.dependsOn || []).map((d) => [d, results[d]]));
    if (signal?.aborted || (deadlineAt && now() >= deadlineAt)) {
      tele.cancelled += 1;
      return notExecuted(
        id,
        'cancelled',
        signal?.aborted
          ? 'the run was cancelled'
          : 'the run deadline passed before this step could start',
        { operation: s.operation },
      );
    }
    const up = blockedBy(s);
    if (up) {
      tele.skipped += 1;
      return notExecuted(
        id,
        'skipped_dependency',
        `needs ${up.stepId}, which was ${up.status}${up.reason ? ` (${up.reason})` : ''}`,
        { operation: s.operation },
      );
    }
    const op = ops[s.operation];
    if (!op) {
      tele.failed += 1;
      return notExecuted(id, 'unsupported', `no executor for ${s.operation}`, {
        operation: s.operation,
      });
    }
    if (s.key && cache.has(s.key)) {
      tele.cacheHits += 1;
      return cache.get(s.key);
    }
    tele.run += 1;
    try {
      const r = await op(s, inputs, { signal });
      const out = r?.stepId === id ? r : stepResult({ ...r, stepId: id, operation: s.operation });
      if (s.key && USABLE.has(out.status)) cache.set(s.key, out);
      if (!USABLE.has(out.status)) tele.failed += 1;
      return out;
    } catch (e) {
      tele.failed += 1;
      const msg = String(e?.message || e).slice(0, 200);
      const status =
        e?.status === 403 || /\b403\b|forbidden|not entitled|permission/i.test(msg)
          ? e?.entitlement
            ? 'permission_denied'
            : 'provider_error'
          : 'provider_error';
      return notExecuted(id, status, msg, { operation: s.operation });
    }
  };

  while (pending.size || running.size) {
    for (const id of [...pending]) {
      if (running.size >= Math.max(1, concurrency)) break;
      if (!ready(id)) continue;
      pending.delete(id);
      running.set(
        id,
        runOne(id).then((r) => ({ id, r })),
      );
      tele.maxParallel = Math.max(tele.maxParallel, running.size);
    }
    if (!running.size) break;
    // eslint-disable-next-line no-await-in-loop
    const { id, r } = await Promise.race(running.values());
    running.delete(id);
    results[id] = r;
  }
  tele.durationMs = now() - started;
  return { ok: true, results, order: v.order, telemetry: tele };
}
