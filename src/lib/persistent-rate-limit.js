/**
 * Supabase-backed rate limiter (reliability audit P2-12).
 *
 * Survives cold starts and is shared across all serverless instances. Each
 * check is ONE atomic statement (rate_limit_hit: insert ... on conflict do
 * update ... returning), so a burst of parallel requests cannot all read the
 * same count and pass.
 *
 * When the database is unreachable the result depends on `failClosed`:
 *  - failClosed: true (auth, AI, Sonar, /api/v1 and other strict routes):
 *    the request is refused (allowed: false, degraded: true);
 *  - otherwise the request is allowed and the outage is reported to Sentry
 *    (at most once a minute per instance), so it is never silent.
 * Until the migration is applied (no rate_limit_hit), the old read-then-
 * write path is used.
 */

import { getAdminClient } from '@/lib/supabase';
import { withTimeout } from '@/lib/with-timeout';
import { BoundedMap } from '@/lib/bounded-map';

/* Oct 26: the limiter's RPC had no bound of its own, so it inherited the
   admin client's 60s fetch timeout. With the database IO-starved, every
   fail-closed route (Sonar included) waited a full minute and then answered
   503 "Service temporarily unavailable", before any of its own work ran.
   The call is now bounded, and a short-window bucket that cannot reach the
   database is counted in memory on this instance instead of refused. */
const DB_TIMEOUT_MS = Math.max(250, Number(process.env.RATE_LIMIT_DB_TIMEOUT_MS) || 2000);
/* Windows up to this length fall back to the in-memory count. Daily caps
   (ai-day, ai-global, Sonar's daily quota) do not: a per-instance count
   cannot hold a daily budget, so they stay fail-closed. */
const MEMORY_FALLBACK_MAX_WINDOW_MS = 10 * 60_000;
const memBuckets = new BoundedMap(5000);

function memoryHit(bucketKey, limit, windowMs) {
  const now = Date.now();
  let b = memBuckets.get(bucketKey);
  if (!b || b.resetAt <= now) b = { count: 0, resetAt: now + windowMs };
  b.count += 1;
  memBuckets.set(bucketKey, b);
  return {
    allowed: b.count <= limit,
    remaining: Math.max(0, limit - b.count),
    resetAt: new Date(b.resetAt),
    degraded: true,
    memory: true,
  };
}

const MISSING_FN = new Set(['PGRST202', '42883']);
let lastOutageReport = 0;

function reportOutage(bucketKey, message) {
  console.warn(`[rate-limit] limiter unavailable for ${bucketKey}: ${message}`);
  const now = Date.now();
  if (now - lastOutageReport < 60_000) return;
  lastOutageReport = now;
  import('@sentry/nextjs')
    .then((Sentry) =>
      Sentry.captureMessage(`rate limiter unavailable: ${message}`, { level: 'warning' }),
    )
    .catch(() => {});
}

function degraded(bucketKey, limit, windowMs, failClosed, message) {
  reportOutage(bucketKey, message);
  /* A fail-closed short window is still enforced while the database is
     unreachable, counted per instance in memory, instead of refusing every
     request. Going over that in-memory limit is reported as an ordinary
     over-limit (degraded: false), so callers answer 429, not a 503 outage. */
  if (failClosed && windowMs <= MEMORY_FALLBACK_MAX_WINDOW_MS) {
    const m = memoryHit(bucketKey, limit, windowMs);
    return m.allowed ? m : { ...m, degraded: false };
  }
  const resetAt = new Date(Date.now() + windowMs);
  return failClosed
    ? { allowed: false, remaining: 0, resetAt, degraded: true }
    : { allowed: true, remaining: limit, resetAt, degraded: true };
}

/**
 * Check + increment a rate limit bucket.
 *
 * @param {string} bucketKey - unique key like `auth:1.2.3.4` or `global:1.2.3.4`
 * @param {number} limit - max requests allowed in the window
 * @param {number} windowMs - window size in milliseconds
 * @param {{ failClosed?: boolean }} [opts]
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: Date, degraded?: boolean}>}
 */
export async function checkRateLimit(bucketKey, limit, windowMs, { failClosed = false } = {}) {
  if (!bucketKey) return { allowed: true, remaining: limit, resetAt: new Date() };
  try {
    const admin = getAdminClient();
    const call = await withTimeout(
      admin.rpc('rate_limit_hit', {
        p_key: bucketKey,
        p_limit: limit,
        p_window_ms: windowMs,
      }),
      DB_TIMEOUT_MS,
      'rate_limit_hit',
    );
    if (!call.ok) {
      return degraded(
        bucketKey,
        limit,
        windowMs,
        failClosed,
        call.timedOut ? `timed out after ${DB_TIMEOUT_MS}ms` : call.error?.message || 'rpc failed',
      );
    }
    const { data, error } = call.value;
    if (error) {
      if (MISSING_FN.has(error.code))
        return legacyCheck(admin, bucketKey, limit, windowMs, failClosed);
      return degraded(bucketKey, limit, windowMs, failClosed, error.message);
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return degraded(bucketKey, limit, windowMs, failClosed, 'empty result');
    return {
      allowed: row.allowed === true,
      remaining: Math.max(0, limit - Number(row.hits || 0)),
      resetAt: new Date(row.reset_at),
    };
  } catch (err) {
    return degraded(bucketKey, limit, windowMs, failClosed, err?.message || String(err));
  }
}

/* Pre-migration path (read-then-write, not atomic). */
async function legacyCheck(admin, bucketKey, limit, windowMs, failClosed) {
  const now = new Date();
  const windowExpiresAt = new Date(now.getTime() + windowMs);
  const { data: existing, error: fetchErr } = await admin
    .from('rate_limit_buckets')
    .select('count, window_start, expires_at')
    .eq('bucket_key', bucketKey)
    .maybeSingle();
  if (fetchErr) return degraded(bucketKey, limit, windowMs, failClosed, fetchErr.message);

  if (!existing || new Date(existing.expires_at) < now) {
    await admin.from('rate_limit_buckets').upsert({
      bucket_key: bucketKey,
      count: 1,
      window_start: now.toISOString(),
      expires_at: windowExpiresAt.toISOString(),
      last_hit_at: now.toISOString(),
    });
    return { allowed: true, remaining: limit - 1, resetAt: windowExpiresAt };
  }
  const newCount = existing.count + 1;
  const resetAt = new Date(existing.expires_at);
  await admin
    .from('rate_limit_buckets')
    .update({ count: newCount, last_hit_at: now.toISOString() })
    .eq('bucket_key', bucketKey);
  if (newCount > limit) return { allowed: false, remaining: 0, resetAt };
  return { allowed: true, remaining: limit - newCount, resetAt };
}

/**
 * Log a security event to the audit log. Fire-and-forget — never blocks.
 */
export async function logSecurityEvent(eventType, payload = {}) {
  try {
    const admin = getAdminClient();
    await admin.from('security_audit_log').insert({
      event_type: eventType,
      severity: payload.severity || 'info',
      ip_address: payload.ip,
      actor_id: payload.userId || null,
      user_email: payload.email || null,
      endpoint: payload.endpoint || null,
      details: payload.details || {},
    });
  } catch (err) {
    console.warn('[security-audit] log error:', err?.message);
  }
}
