/**
 * Ingestion dispatcher (Sonar 6.4 hardening, Nov 28 2026).
 *
 * Vercel allows 100 cron definitions per project and Ezana was at the limit, so every new
 * ingestion job used to cost a slot and the 101st broke the build. The dispatcher is one
 * cron, every minute, that runs the jobs registered in dispatch-registry.js on their own
 * schedules. Each job is still its own route with its own CRON_SECRET check, cron lock,
 * ingest_runs row and checkpoint (cronRoute), so behaviour per job does not change:
 *
 *   - schedule:     standard 5-field cron expression, evaluated in UTC per minute
 *   - idempotency:  the job route's cron lock (one run per lock key at a time); a second
 *                   dispatch while it runs answers { skipped: 'locked' }
 *   - checkpointing: owned by the job (resumable cursors, ingest_progress, stale-first)
 *   - retries:      a dispatch that fails fast (network error, 5xx, 429 within the ack
 *                   window) is retried up to `retries` times with backoff in the same tick;
 *                   a job that is still running when the ack window closes counts as started
 *   - concurrency:  at most MAX_PARALLEL dispatches in flight per tick, and per job group
 *   - monitoring:   the dispatcher's own ingest_runs row carries a summary; each job keeps
 *                   its own run log; failures go to failed_jobs through the job's cronRoute
 *
 * Pure parts (cron matching, due selection, the fan-out loop with an injected fetch) are
 * exported for scripts/check-cron-dispatch.mjs.
 */

const FIELD_RANGES = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // day of month
  [1, 12], // month
  [0, 6], // day of week (0 = Sunday; 7 accepted as Sunday)
];

function parseField(src, [lo, hi]) {
  const out = new Set();
  for (const part of String(src).split(',')) {
    const [range, stepStr] = part.split('/');
    const step = stepStr ? Number(stepStr) : 1;
    if (!Number.isInteger(step) || step < 1) throw new Error(`bad step in "${src}"`);
    let a;
    let b;
    if (range === '*') {
      a = lo;
      b = hi;
    } else if (range.includes('-')) {
      [a, b] = range.split('-').map(Number);
    } else {
      a = Number(range);
      b = stepStr ? hi : a;
    }
    if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error(`bad field "${src}"`);
    if (hi === 6 && b === 7) b = 6 + (a === 7 ? 1 : 0);
    for (let v = a; v <= b; v += step) {
      const x = hi === 6 && v === 7 ? 0 : v;
      if (x < lo || x > hi) throw new Error(`"${src}" out of range ${lo}-${hi}`);
      out.add(x);
    }
  }
  return out;
}

/** Parse "m h dom mon dow" into sets; throws on anything malformed. */
export function parseCron(expr) {
  const parts = String(expr).trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`cron "${expr}" must have 5 fields`);
  const sets = parts.map((p, i) => parseField(p, FIELD_RANGES[i]));
  return { sets, domStar: parts[2] === '*', dowStar: parts[4] === '*' };
}

/** True when `expr` fires in the UTC minute containing `date` (Vixie day semantics). */
export function cronMatches(expr, date) {
  const { sets, domStar, dowStar } = parseCron(expr);
  const d = new Date(date);
  const [mi, h, dom, mon, dow] = sets;
  if (!mi.has(d.getUTCMinutes()) || !h.has(d.getUTCHours()) || !mon.has(d.getUTCMonth() + 1))
    return false;
  const domOk = dom.has(d.getUTCDate());
  const dowOk = dow.has(d.getUTCDay());
  if (domStar || dowStar) return domOk && dowOk;
  return domOk || dowOk;
}

/** Jobs due in this minute, enabled ones only, in registry order. */
export function dueJobs(registry, now = new Date(), env = {}) {
  return registry.filter((j) => {
    if (j.enabled === false) return false;
    if (j.enabledEnv && !env[j.enabledEnv]) return false;
    if (j.until && now.getTime() > new Date(j.until).getTime()) return false;
    return cronMatches(j.schedule, now);
  });
}

/** Static validation used by the test and at dispatch time. */
export function validateRegistry(registry) {
  const problems = [];
  const seen = new Set();
  for (const j of registry) {
    if (!j.id || seen.has(j.id)) problems.push(`duplicate or missing id: ${j.id}`);
    seen.add(j.id);
    if (!/^\/api\/cron\/[a-z0-9-]+(\?[a-z0-9=&_.-]+)?$/i.test(j.path || ''))
      problems.push(`${j.id}: path must be an /api/cron/ route`);
    if (j.path?.startsWith('/api/cron/dispatch')) problems.push(`${j.id}: cannot dispatch itself`);
    try {
      parseCron(j.schedule);
    } catch (e) {
      problems.push(`${j.id}: ${e.message}`);
    }
  }
  return problems;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Dispatch one job: GET its route with the cron bearer. The ack window is short on purpose:
 * Vercel keeps a function running after its caller disconnects (request cancellation is
 * opt-in and not enabled here), so a long job keeps working and is reported as `started`.
 */
export async function dispatchOne(job, { origin, secret, fetchImpl, ackMs, backoffMs = 1500 }) {
  const attempts = [];
  const tries = 1 + Math.max(0, job.retries ?? 1);
  for (let i = 0; i < tries; i += 1) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), job.ackMs ?? ackMs);
    const t0 = Date.now();
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetchImpl(`${origin}${job.path}`, {
        method: 'GET',
        headers: { authorization: `Bearer ${secret}`, 'x-ezana-dispatch': job.id },
        signal: ctl.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      let body = null;
      try {
        // eslint-disable-next-line no-await-in-loop
        body = await res.json();
      } catch {
        body = null;
      }
      const ms = Date.now() - t0;
      if (res.status === 429 || res.status >= 500) {
        attempts.push({ http: res.status, ms });
        // eslint-disable-next-line no-await-in-loop
        if (i < tries - 1) await sleep(backoffMs * (i + 1));
        continue;
      }
      const state = res.status >= 400 ? 'rejected' : body?.skipped ? 'skipped' : 'completed';
      return {
        id: job.id,
        state,
        http: res.status,
        ms,
        attempts: attempts.length + 1,
        detail: body?.skipped || body?.error || null,
      };
    } catch (e) {
      clearTimeout(timer);
      if (e?.name === 'AbortError') {
        return { id: job.id, state: 'started', ms: Date.now() - t0, attempts: attempts.length + 1 };
      }
      attempts.push({ error: String(e?.message || e).slice(0, 120) });
      // eslint-disable-next-line no-await-in-loop
      if (i < tries - 1) await sleep(backoffMs * (i + 1));
    }
  }
  const last = attempts[attempts.length - 1] || {};
  return {
    id: job.id,
    state: 'failed',
    http: last.http ?? null,
    attempts: attempts.length,
    detail: last.error || (last.http ? `HTTP ${last.http}` : 'unknown'),
  };
}

/**
 * Fan out the due jobs with a global parallelism cap and a per-group cap (jobs sharing an
 * upstream, e.g. SEC EDGAR at 10 requests a second, share a group).
 */
export async function dispatchDue(jobs, opts) {
  const maxParallel = opts.maxParallel ?? 8;
  const results = [];
  const groupLoad = new Map();
  const queue = [...jobs];
  const running = new Set();
  const canRun = (j) => {
    const g = j.group || j.id;
    const cap = j.groupLimit ?? 1;
    return (groupLoad.get(g) || 0) < cap;
  };
  while (queue.length || running.size) {
    let launched = false;
    for (let i = 0; i < queue.length && running.size < maxParallel; i += 1) {
      const j = queue[i];
      if (!canRun(j)) continue;
      queue.splice(i, 1);
      i -= 1;
      const g = j.group || j.id;
      groupLoad.set(g, (groupLoad.get(g) || 0) + 1);
      const p = dispatchOne(j, opts).then((r) => {
        results.push(r);
        groupLoad.set(g, groupLoad.get(g) - 1);
        running.delete(p);
      });
      running.add(p);
      launched = true;
    }
    if (!running.size && !launched && queue.length) {
      // Every remaining job's group is saturated by nothing running: a config error.
      for (const j of queue.splice(0))
        results.push({ id: j.id, state: 'failed', detail: 'group limit 0' });
      break;
    }
    // eslint-disable-next-line no-await-in-loop
    if (running.size) await Promise.race(running);
  }
  const order = new Map(jobs.map((j, i) => [j.id, i]));
  return results.sort((a, b) => order.get(a.id) - order.get(b.id));
}

export function summarize(results) {
  const by = {};
  for (const r of results) by[r.state] = (by[r.state] || 0) + 1;
  const failed = results.filter((r) => r.state === 'failed' || r.state === 'rejected');
  return {
    dispatched: results.length,
    ...by,
    errors: failed.map((r) => `${r.id}: ${r.detail || r.http || 'failed'}`),
  };
}
