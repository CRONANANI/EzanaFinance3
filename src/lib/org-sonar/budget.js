/**
 * Sonar for organizations: the pooled deep research budget (Nov 2026).
 *
 * An organization has one monthly pool of deep research runs. Executives set
 * the pool and may give any member a monthly allocation (a cap within the
 * pool); a member without one draws from the pool until it is used. Every
 * org member's deep run is reserved against the pool before any spend by
 * reserve_sonar_ping_org_deep (20261107130000_org_sonar_budget.sql), which
 * refuses with 'org_pool' or 'org_allocation'. Months are UTC calendar
 * months. Standard and quick research are not drawn from the pool.
 *
 * Pure and client-safe apart from the env defaults; unit-tested in
 * scripts/check-org-sonar.mjs.
 */

export const DEEP_PREFIX = 'research:deep:';

/** The pool an org gets until an executive sets one. */
export function defaultOrgPool(env = typeof process !== 'undefined' ? process.env : {}) {
  const n = Number(env?.ORG_SONAR_MONTHLY_DEEP);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 100;
}

/** The largest pool an executive may set (a cost control). */
export function maxOrgPool(env = typeof process !== 'undefined' ? process.env : {}) {
  const n = Number(env?.ORG_SONAR_MONTHLY_DEEP_MAX);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 500;
}

export function monthStartUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function nextResetUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** "December 1" for the reset line. */
export function resetLabel(now = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(nextResetUtc(now));
}

const int = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
};

/**
 * A clean budget change from an executive, or { error }.
 * { monthlyDeepRuns?, allocations?: [{ userId, monthlyDeepRuns|null }] }
 */
export function cleanBudgetPatch(body = {}, { max = maxOrgPool() } = {}) {
  const out = {};
  if ('monthlyDeepRuns' in body) {
    const n = int(body.monthlyDeepRuns);
    if (n === null) return { error: 'The monthly pool is a whole number of runs.' };
    if (n > max) return { error: `The monthly pool can be at most ${max} runs.` };
    out.pool = n;
  }
  if ('allocations' in body) {
    if (!Array.isArray(body.allocations)) return { error: 'Allocations are a list.' };
    const seen = new Set();
    out.allocations = [];
    for (const a of body.allocations.slice(0, 500)) {
      const userId = String(a?.userId || '');
      if (!/^[0-9a-f-]{36}$/i.test(userId) || seen.has(userId)) continue;
      seen.add(userId);
      if (a.monthlyDeepRuns === null || a.monthlyDeepRuns === '') {
        out.allocations.push({ userId, runs: null });
        continue;
      }
      const n = int(a.monthlyDeepRuns);
      if (n === null || n > max) return { error: `An allocation is a whole number up to ${max}.` };
      out.allocations.push({ userId, runs: n });
    }
  }
  if (!('pool' in out) && !out.allocations?.length) return { error: 'Nothing to change.' };
  return { patch: out };
}

/**
 * This month's usage from the ledger rows (sonar_queries for the org since
 * the month started: { user_id, version, created_at }).
 * @returns {{ pool: number, used: number, remaining: number, resetsOn: string,
 *   members: Array<{ userId, name, role, deepRuns, allocation, left, share }> }}
 */
export function usageSummary({
  pool,
  rows = [],
  allocations = [],
  members = [],
  now = new Date(),
}) {
  const since = monthStartUtc(now).getTime();
  const deep = rows.filter(
    (r) =>
      String(r.version || '').startsWith(DEEP_PREFIX) && new Date(r.created_at).getTime() >= since,
  );
  const byUser = new Map();
  for (const r of deep) byUser.set(r.user_id, (byUser.get(r.user_id) || 0) + 1);
  const alloc = new Map(allocations.map((a) => [a.user_id, a.monthly_deep_runs]));
  const used = deep.length;
  const people = new Map(members.map((m) => [m.user_id, m]));
  for (const id of byUser.keys()) if (!people.has(id)) people.set(id, { user_id: id });
  const list = [...people.values()].map((m) => {
    const runs = byUser.get(m.user_id) || 0;
    const a = alloc.has(m.user_id) ? alloc.get(m.user_id) : null;
    return {
      userId: m.user_id,
      name: m.display_name || 'Former member',
      role: m.role || null,
      active: m.is_active !== false && Boolean(m.role),
      deepRuns: runs,
      allocation: a,
      left: a == null ? null : Math.max(0, a - runs),
      share: used ? runs / used : 0,
    };
  });
  list.sort((x, y) => y.deepRuns - x.deepRuns || String(x.name).localeCompare(String(y.name)));
  return {
    pool,
    used,
    remaining: Math.max(0, pool - used),
    resetsOn: nextResetUtc(now).toISOString().slice(0, 10),
    members: list,
  };
}

/** Org deep runs per month for the last `months` months, oldest first. */
export function monthlyHistory(rows = [], { months = 6, now = new Date() } = {}) {
  const out = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({ month: d.toISOString().slice(0, 7), runs: 0 });
  }
  const at = new Map(out.map((m, i) => [m.month, i]));
  for (const r of rows) {
    if (!String(r.version || '').startsWith(DEEP_PREFIX)) continue;
    const k = String(r.created_at || '').slice(0, 7);
    if (at.has(k)) out[at.get(k)].runs += 1;
  }
  return out;
}

/** The message a member sees when the pool or their allocation is used. */
export function budgetMessage(reason, { pool = null, allocation = null, now = new Date() } = {}) {
  const when = resetLabel(now);
  if (reason === 'org_allocation') {
    return `You have used your ${allocation ?? ''} deep research runs for this month. They reset on ${when}. An executive can raise your allocation; a standard answer is still available.`.replace(
      'your  deep',
      'your deep',
    );
  }
  return `Your fund has used this month's ${pool ?? ''} deep research runs. They reset on ${when}. An executive can raise the budget; a standard answer is still available.`.replace(
    "month's  deep",
    "month's deep",
  );
}
