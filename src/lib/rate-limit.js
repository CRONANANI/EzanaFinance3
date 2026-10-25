import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getClientIp as clientIp } from '@/lib/client-ip';
import { checkRateLimit as checkDbRateLimit } from '@/lib/persistent-rate-limit';

/* ═══════════════════════════════════════════════════════════════════════════
 * Redis-backed rate limiting (Upstash sliding window), the fast layer in
 * front of the per-route logic. Without Upstash, or when it errors, checks
 * fall back to the shared database limiter instead of passing everything;
 * see checkRateLimit below. Reuses the UPSTASH_REDIS_REST_URL / _TOKEN env
 * vars of the cache layer.
 * ═══════════════════════════════════════════════════════════════════════════ */

let redis;
let redisInitialized = false;

function getRedis() {
  if (redisInitialized) return redis;
  redisInitialized = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redis = null;
    return null;
  }
  try {
    redis = new Redis({ url, token });
  } catch (e) {
    console.warn('[rate-limit] Redis init failed; Redis limiting disabled:', e?.message);
    redis = null;
  }
  return redis;
}

// One Ratelimit instance per (limit, window) tuple, cached across invocations.
const limiters = new Map();

function getLimiter(limit, windowStr) {
  const client = getRedis();
  if (!client) return null;
  const key = `${limit}:${windowStr}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(limit, windowStr),
      prefix: 'ezana:rl',
      analytics: false,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

/* Buckets that must never pass unmetered: auth, API keys, AI and Sonar. */
const FAIL_CLOSED_PREFIX = /^(auth|api:key|ai|sonar)[:-]/;

const UNIT_MS = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
export function windowToMs(windowStr) {
  const m = /^\s*(\d+)\s*(ms|s|m|h|d)\s*$/.exec(String(windowStr || ''));
  return m ? Number(m[1]) * UNIT_MS[m[2]] : 60_000;
}

/**
 * Check an identifier against a sliding-window limit (Upstash Redis).
 *
 * When Redis is not configured or errors, the check falls back to the
 * shared database limiter (src/lib/persistent-rate-limit.js) rather than
 * silently allowing everything (reliability audit P2-12). Fail-closed
 * buckets (auth:, api:key:, ai:, sonar:, or opts.failClosed) are refused if
 * that also fails; the rest are allowed and the outage is reported.
 *
 * @param {string} identifier  e.g. `auth:send-verification:1.2.3.4`
 * @param {{limit?:number, window?:string, failClosed?:boolean}} [opts]  default 30 per '60 s'
 * @returns {Promise<{success:boolean, remaining:number, reset:number, limit:number, degraded?:boolean}>}
 */
export async function checkRateLimit(identifier, opts = {}) {
  const limit = opts.limit ?? 30;
  const window = opts.window ?? '60 s';
  const id = String(identifier || 'unknown');
  const failClosed = opts.failClosed ?? FAIL_CLOSED_PREFIX.test(id);
  const limiter = getLimiter(limit, window);
  if (limiter) {
    try {
      const res = await limiter.limit(id);
      return { success: res.success, remaining: res.remaining, reset: res.reset, limit: res.limit };
    } catch (e) {
      console.warn('[rate-limit] Redis check failed; using the database limiter:', e?.message);
    }
  }
  const db = await checkDbRateLimit(`rl:${id}`, limit, windowToMs(window), { failClosed });
  return {
    success: db.allowed,
    remaining: db.remaining,
    reset: db.resetAt?.getTime?.() || 0,
    limit,
    degraded: true,
  };
}

/** The client IP (see src/lib/client-ip.js), or 'unknown'. */
export function getClientIp(request) {
  return clientIp(request) || 'unknown';
}

/** Build a standard 429 Response (with Retry-After) for a failed check. */
export function rateLimitResponse(result) {
  const retryAfter = result?.reset
    ? Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
    : 60;
  return new Response(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfter),
      'X-RateLimit-Limit': String(result?.limit ?? ''),
      'X-RateLimit-Remaining': String(result?.remaining ?? 0),
    },
  });
}
