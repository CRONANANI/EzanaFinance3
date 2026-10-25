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
    const { data, error } = await admin.rpc('rate_limit_hit', {
      p_key: bucketKey,
      p_limit: limit,
      p_window_ms: windowMs,
    });
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
