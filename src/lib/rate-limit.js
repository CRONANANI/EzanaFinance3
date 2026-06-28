import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const rateLimit = new Map();

export function rateLimiter({ interval = 60000, limit = 30 }) {
  return {
    check: (key) => {
      const now = Date.now();
      const record = rateLimit.get(key);

      if (!record || now - record.start > interval) {
        rateLimit.set(key, { start: now, count: 1 });
        return { success: true, remaining: limit - 1 };
      }

      if (record.count >= limit) {
        return { success: false, remaining: 0 };
      }

      record.count++;
      return { success: true, remaining: limit - record.count };
    },
  };
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimit) {
    if (now - val.start > 300000) rateLimit.delete(key);
  }
}, 300000);

/* ═══════════════════════════════════════════════════════════════════════════
 * Layer 2b — Redis-backed, IP-level rate limiting (Upstash sliding window).
 *
 * An additional, faster layer in FRONT of the existing per-route logic (the
 * Supabase-backed auth lockout and the persistent global limiter). Deliberately
 * fail-OPEN: if Upstash isn't configured or a call errors, the request is
 * allowed and the failure is logged — a rate-limiter outage must never lock
 * users out. Auth routes keep their Supabase lockout as a backstop. Reuses the
 * same UPSTASH_REDIS_REST_URL / _TOKEN env vars as the cache layer.
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

/**
 * Check an IP/identifier against a sliding-window limit. Fails OPEN
 * (success:true) when Redis is unavailable or errors.
 *
 * @param {string} identifier  e.g. `auth:send-verification:1.2.3.4`
 * @param {{limit?:number, window?:string}} [opts]  default 30 per '60 s'
 * @returns {Promise<{success:boolean, remaining:number, reset:number, limit:number, degraded?:boolean}>}
 */
export async function checkRateLimit(identifier, opts = {}) {
  const limit = opts.limit ?? 30;
  const window = opts.window ?? '60 s';
  const limiter = getLimiter(limit, window);
  if (!limiter) {
    return { success: true, remaining: limit, reset: 0, limit, degraded: true };
  }
  try {
    const res = await limiter.limit(String(identifier || 'unknown'));
    return { success: res.success, remaining: res.remaining, reset: res.reset, limit: res.limit };
  } catch (e) {
    console.warn('[rate-limit] check failed; failing open:', e?.message);
    return { success: true, remaining: limit, reset: 0, limit, degraded: true };
  }
}

/** Best-effort client IP from Vercel / proxy headers. */
export function getClientIp(request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
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
