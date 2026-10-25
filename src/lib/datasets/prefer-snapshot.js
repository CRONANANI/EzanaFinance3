/**
 * Snapshot-first read for dataset cards (QA PLAT-2). Pure: the caller passes
 * how to read the snapshot row and how to compute the value live.
 *
 *   - a snapshot younger than `maxAgeMs` is served as is (no live query);
 *   - otherwise the live loader runs;
 *   - if the live loader fails and a stale snapshot exists, the stale
 *     snapshot is served rather than an error;
 *   - a failing snapshot read (table not applied yet, timeout) counts as
 *     "no snapshot" and never throws.
 *
 * `readSnapshot()` resolves to { payload, builtAt } or null.
 */
export const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function isFresh(builtAt, maxAgeMs = SNAPSHOT_MAX_AGE_MS, now = Date.now()) {
  const t = builtAt ? Date.parse(builtAt) : NaN;
  return Number.isFinite(t) && now - t >= 0 && now - t < maxAgeMs;
}

export async function preferSnapshot({
  readSnapshot,
  live,
  maxAgeMs = SNAPSHOT_MAX_AGE_MS,
  now = Date.now,
}) {
  let snap = null;
  try {
    snap = await readSnapshot();
  } catch {
    snap = null;
  }
  if (snap && snap.payload != null && isFresh(snap.builtAt, maxAgeMs, now())) {
    return snap.payload;
  }
  try {
    return await live();
  } catch (e) {
    if (snap && snap.payload != null) return snap.payload;
    throw e;
  }
}
