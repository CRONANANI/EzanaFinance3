'use client';

/**
 * A small client cache of JSON GETs, keyed by URL, for side panels that must
 * open in under half a second. A pointer over, focus or touch on anything
 * that opens a member starts the reads (prefetchMember*), so the click
 * usually resolves from here. Entries live five minutes; a failed read is
 * dropped so the next attempt goes to the network again.
 */

const TTL_MS = 5 * 60 * 1000;
const MAX = 120;
const cache = new Map(); // url -> { at, promise }

function read(url) {
  return fetch(url).then(async (r) => {
    const d = await r.json().catch(() => ({}));
    return { status: r.status, ok: r.ok && d?.ok !== false, d };
  });
}

/** The cached read of `url` (a promise of { status, ok, d }), started now if needed. */
export function getJson(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = read(url).then(
    (out) => {
      if (!out.ok) cache.delete(url);
      return out;
    },
    (e) => {
      cache.delete(url);
      throw e;
    },
  );
  cache.set(url, { at: Date.now(), promise });
  if (cache.size > MAX) cache.delete(cache.keys().next().value);
  return promise;
}

/** Start a read without waiting for it; errors are swallowed here. */
export function prefetchJson(url) {
  getJson(url).catch(() => {});
}

const ID = /^[A-Z]\d{6}$/;
const norm = (id) => String(id || '').toUpperCase();

/* ── Capitol Watch member drawer ─────────────────────────────────────── */

export const memberCoreUrl = (id) =>
  `/api/datasets/capitol/member?bioguide=${encodeURIComponent(norm(id))}&part=core`;
export const memberExtraUrl = (id) =>
  `/api/datasets/capitol/member?bioguide=${encodeURIComponent(norm(id))}&part=extra`;

export function prefetchMember(id) {
  if (!ID.test(norm(id))) return;
  prefetchJson(memberCoreUrl(id));
  prefetchJson(memberExtraUrl(id));
}

/* ── Politician Tracker panel ────────────────────────────────────────── */

export const trackerPortfolioUrl = (id) =>
  `/api/politicians/portfolio?bioguide=${encodeURIComponent(norm(id))}`;
export const trackerCommitteesUrl = (id) =>
  `/api/committees/member/${encodeURIComponent(norm(id))}?lite=1`;

export function prefetchTrackerMember(id) {
  if (!ID.test(norm(id))) return;
  prefetchJson(trackerPortfolioUrl(id));
  prefetchJson(trackerCommitteesUrl(id));
}

/**
 * One delegated listener: pointer over, focus or touch on any element with
 * data-member="<bioguide>" inside `root` calls `onIntent(id)` once per id
 * per 30 seconds. Returns the cleanup.
 */
export function listenForMemberIntent(root, onIntent) {
  if (!root) return () => {};
  const seen = new Map();
  const handler = (e) => {
    const el = e.target?.closest?.('[data-member]');
    if (!el || !root.contains(el)) return;
    const id = norm(el.getAttribute('data-member'));
    if (!ID.test(id)) return;
    const last = seen.get(id) || 0;
    if (Date.now() - last < 30000) return;
    seen.set(id, Date.now());
    onIntent(id);
  };
  root.addEventListener('pointerover', handler, { passive: true });
  root.addEventListener('focusin', handler);
  root.addEventListener('touchstart', handler, { passive: true });
  return () => {
    root.removeEventListener('pointerover', handler);
    root.removeEventListener('focusin', handler);
    root.removeEventListener('touchstart', handler);
  };
}
