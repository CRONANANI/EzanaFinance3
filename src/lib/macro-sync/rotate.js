/**
 * Hourly rotator: one cron runs every macro adapter that does not have a dedicated route.
 *
 * Each call walks the adapters in a stable order that starts at a different place every hour,
 * so a slow source never starves the ones after it. runSync() already decides whether an
 * adapter is due (cursor mid-pass, or last full pass older than refreshAfterDays), so a
 * fresh adapter costs one small state read. Work stops when the time budget runs low; the
 * checkpointed cursor means the next hour resumes exactly where this one stopped.
 */
import { runSync } from './engine.js';

/** Why an adapter is not runnable here, or null when it is. */
export function adapterStatus(adapter, env = process.env) {
  if (adapter.enabled === false) return 'disabled';
  if (adapter.dedicatedCron) return 'dedicated cron';
  const missing = (adapter.requiresEnv || []).filter((k) => !env[k]);
  if (missing.length) return `missing env ${missing.join(', ')}`;
  return null;
}

/**
 * @param {object} db  Supabase admin client
 * @param {Record<string, object>} adapters  ADAPTERS from ./index.js
 * @param {{ budgetMs?: number, only?: string[], force?: boolean, now?: Date, env?: object }} [opts]
 */
export async function runDue(db, adapters, opts = {}) {
  const {
    budgetMs = 240000,
    only = null,
    force = false,
    now = new Date(),
    env = process.env,
  } = opts;
  const deadline = Date.now() + budgetMs;
  const list = Object.values(adapters).filter((a) => !only || only.includes(a.source));
  const start = list.length ? now.getUTCHours() % list.length : 0;
  const ordered = [...list.slice(start), ...list.slice(0, start)];

  const results = [];
  for (const adapter of ordered) {
    const reason = only
      ? adapter.enabled === false
        ? 'disabled'
        : null
      : adapterStatus(adapter, env);
    if (reason) {
      results.push({ source: adapter.source, skipped: true, reason });
      continue;
    }
    const remaining = deadline - Date.now();
    if (remaining < 45000) {
      results.push({ source: adapter.source, skipped: true, reason: 'time budget used' });
      continue;
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      results.push(await runSync(db, adapter, { budgetMs: remaining - 15000, force }));
    } catch (e) {
      results.push({ source: adapter.source, errors: [String(e?.message || e)] });
    }
  }
  return results;
}
