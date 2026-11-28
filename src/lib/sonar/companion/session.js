/**
 * Sonar Companion: conversations, scopes and run continuity (Nov 28 2026).
 *
 * A conversation belongs to one access scope: 'personal', or 'org:<orgId>'. When the reader
 * switches workspace or organization, entries from another scope are no longer shown or
 * reused; they stay only in their own scope's record and reappear when the reader returns.
 *
 * Research results are not kept on the device. A conversation entry keeps only what reopens
 * it through the authorized backend: the run id (standard and deep runs are stored server
 * side, /api/sonar/history?id=) or the council capability. Opening, resizing, minimizing,
 * expanding or navigating never sends a request; only an explicit question does.
 *
 * Two tabs asking the same question at once: a short-lived lock keyed by scope and question
 * (sameRunLock) lets the second tab see the first one's run instead of starting another.
 *
 * Pure and client-safe; unit-tested in scripts/check-sonar-companion.mjs.
 */

export const SESSION_KEY = 'ezana:sonar-companion:session:v1';
export const LOCK_PREFIX = 'ezana:sonar-companion:lock:';
export const LOCK_TTL_MS = 120_000;
const MAX_ENTRIES = 20;

export const scopeOf = (ctx) =>
  ctx?.workspace === 'organization' && ctx.organizationId
    ? `org:${ctx.organizationId}`
    : 'personal';

/** Entries visible in `scope`. */
export function entriesIn(entries = [], scope) {
  return entries.filter((e) => e.scope === scope);
}

/** Add an entry; newest last, at most MAX_ENTRIES per scope. */
export function addEntry(entries = [], entry) {
  const next = [...entries, entry];
  const mine = next.filter((e) => e.scope === entry.scope);
  if (mine.length <= MAX_ENTRIES) return next;
  const drop = new Set(mine.slice(0, mine.length - MAX_ENTRIES).map((e) => e.id));
  return next.filter((e) => !drop.has(e.id));
}

export function updateEntry(entries = [], id, patch) {
  return entries.map((e) => (e.id === id ? { ...e, ...patch } : e));
}

/**
 * What may be written to sessionStorage: ids, scope and status only. No question text, no
 * answer, no organization record. A council entry keeps its capability so it can rerun on
 * request (never automatically).
 */
export function persistable(entries = []) {
  return entries
    .filter((e) => e.runId || e.capability)
    .map((e) => ({
      id: e.id,
      scope: e.scope,
      runId: e.runId || null,
      capability: e.capability || null,
      status: e.status === 'running' ? 'interrupted' : e.status,
    }));
}

/**
 * Restore after a hard refresh: a finished run reopens from history by id; a run that was
 * still streaming is shown as interrupted (it may finish on the server and appear in Research
 * history), and is never started again.
 */
export function restorePlan(saved = [], scope) {
  return entriesIn(saved, scope).map((e) => ({
    ...e,
    action:
      e.runId && e.status !== 'interrupted'
        ? 'fetch_history'
        : e.status === 'interrupted'
          ? 'show_interrupted'
          : 'show_rerun_offer',
  }));
}

/** Membership was revoked or expired: drop that organization's entries entirely. */
export function revokeScope(entries = [], orgId) {
  return entries.filter((e) => e.scope !== `org:${orgId}`);
}

/* ── cross-tab dedupe ──────────────────────────────────────────────── */

export function questionKey(scope, question) {
  const q = String(question || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  let h = 0;
  for (let i = 0; i < q.length; i += 1) h = (h * 31 + q.charCodeAt(i)) | 0;
  return `${LOCK_PREFIX}${scope}:${(h >>> 0).toString(36)}`;
}

/** Whether a stored lock blocks a new run of the same question now. */
export function lockActive(value, now = Date.now()) {
  try {
    const v = typeof value === 'string' ? JSON.parse(value) : value;
    return Boolean(v && v.at && now - v.at < LOCK_TTL_MS);
  } catch {
    return false;
  }
}

/**
 * Take the lock for a run, or return the holder. storage: localStorage-like.
 * -> { ok: true } | { ok: false, holder: { tab, runId } }
 */
export function sameRunLock(storage, scope, question, tab, now = Date.now()) {
  const key = questionKey(scope, question);
  try {
    const cur = storage?.getItem(key);
    if (cur && lockActive(cur, now)) {
      const v = JSON.parse(cur);
      if (v.tab !== tab) return { ok: false, holder: { tab: v.tab, runId: v.runId || null } };
    }
    storage?.setItem(key, JSON.stringify({ tab, at: now, runId: null }));
  } catch {
    /* Storage unavailable: no cross-tab guard, the server still meters every run. */
  }
  return { ok: true, key };
}

export function releaseLock(storage, key) {
  try {
    storage?.removeItem(key);
  } catch {
    /* ignore */
  }
}
