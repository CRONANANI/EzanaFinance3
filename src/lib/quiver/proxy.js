/**
 * Quiver Quantitative proxy hardening (Sonar 6.4, Nov 28 2026). SERVER ONLY.
 *
 * /api/quiver/sec13f and /api/quiver/congress-trades call a paid upstream with Ezana's key.
 * Before this change both answered anonymous callers, and any new ticker/owner string cost
 * up to 5 or 10 upstream pages. This module gives both routes:
 *
 *   - parameter validation (tickers, bioguide ids, dates, owner names), so arbitrary
 *     strings cannot bust the cache or reach the upstream
 *   - a response cache per instance (5 minutes) with in-flight de-duplication, on top of
 *     the fetch data cache the routes already use
 *   - a daily upstream quota per signed-in user (or per IP when the route allows guests)
 *   - an upstream counter in the logs: route, pages, rows, ms, cache hit or miss, caller
 *     kind, for cost monitoring
 *
 * Who may call each route is decided in the route (withApiGuard), not here.
 */
import { checkRateLimit } from '@/lib/persistent-rate-limit';
import { logger } from '@/lib/logger';

export const QUIVER_CACHE_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;
const BIOGUIDE_RE = /^[A-Z]\d{6}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const OWNER_RE = /^[\w .,&'()-]{2,80}$/;

/**
 * Validated upstream filters, or { error } naming the bad parameter.
 * @param {URLSearchParams} sp
 * @param {string[]} allowed  parameter names this route accepts
 */
export function quiverParams(sp, allowed) {
  const out = {};
  for (const name of allowed) {
    const raw = (sp.get(name) || '').trim();
    if (!raw) continue;
    if (name === 'ticker') {
      const t = raw.toUpperCase();
      if (!TICKER_RE.test(t)) return { error: 'ticker' };
      out.ticker = t;
    } else if (name === 'bioguide_id') {
      const b = raw.toUpperCase();
      if (!BIOGUIDE_RE.test(b)) return { error: 'bioguide_id' };
      out.bioguide_id = b;
    } else if (name === 'date') {
      if (!DATE_RE.test(raw)) return { error: 'date' };
      out.date = raw;
    } else if (name === 'owner') {
      if (!OWNER_RE.test(raw)) return { error: 'owner' };
      out.owner = raw.replace(/\s+/g, ' ');
    }
  }
  return { params: out };
}

const cache = new Map();
const inflight = new Map();

function cacheKey(route, params) {
  return `${route}?${Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')}`;
}

/** Test hook. */
export function clearQuiverCache() {
  cache.clear();
  inflight.clear();
}

/**
 * Serve a proxied Quiver read through the cache, the quota and the counter.
 * @param {object} o
 * @param {string} o.route         'sec13f' | 'congress-trades'
 * @param {object} o.params        validated filters
 * @param {string} o.caller        `u:<uid>` or `ip:<ip>`
 * @param {number} o.dailyLimit    upstream fetches a caller may cause per day
 * @param {() => Promise<{rows: object[], pages: number}>} o.fetchAll
 * @param {Function} [o.limiter]   checkRateLimit (tests inject one)
 * @returns {Promise<{ rows: object[] } | { quotaExceeded: true, resetAt: Date }>}
 */
export async function serveQuiver({
  route,
  params,
  caller,
  dailyLimit,
  fetchAll,
  limiter = checkRateLimit,
  now = Date.now,
}) {
  const key = cacheKey(route, params);
  const hit = cache.get(key);
  if (hit && now() - hit.at < QUIVER_CACHE_MS) {
    logger.info('quiver upstream', {
      route,
      cache: 'hit',
      rows: hit.rows.length,
      caller: caller.split(':')[0],
    });
    return { rows: hit.rows };
  }
  if (inflight.has(key)) return inflight.get(key);

  /* One miss path per key at a time (registered before any await, so concurrent callers
     share it). Only a miss spends the caller's upstream quota. */
  const p = (async () => {
    const rl = await limiter(`quiver:${route}:${caller}`, dailyLimit, DAY_MS, {
      failClosed: false,
    });
    if (rl && rl.allowed === false) {
      logger.warn('quiver quota', { route, caller: caller.split(':')[0] });
      return { quotaExceeded: true, resetAt: rl.resetAt };
    }
    const t0 = now();
    const { rows, pages, failed = false } = await fetchAll();
    /* A failed upstream read is answered empty and never cached. */
    if (!failed) cache.set(key, { at: now(), rows });
    logger.info('quiver upstream', {
      route,
      cache: 'miss',
      failed,
      pages,
      rows: rows.length,
      ms: now() - t0,
      caller: caller.split(':')[0],
    });
    return { rows };
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
