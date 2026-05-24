/**
 * Supabase-backed rate limiter.
 *
 * Survives Vercel cold starts and is shared across all serverless function
 * instances. Each check is one Supabase upsert query (~30ms overhead).
 *
 * Falls back to allowing the request if the database is unreachable —
 * this is a deliberate trade-off: better to let a request through than
 * to break the entire API if Supabase has a hiccup.
 */

import { getAdminClient } from '@/lib/supabase';

/**
 * Check + increment a rate limit bucket.
 *
 * @param {string} bucketKey - unique key like `auth:1.2.3.4` or `global:1.2.3.4`
 * @param {number} limit - max requests allowed in the window
 * @param {number} windowMs - window size in milliseconds
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: Date}>}
 */
export async function checkRateLimit(bucketKey, limit, windowMs) {
  if (!bucketKey) return { allowed: true, remaining: limit, resetAt: new Date() };

  const now = new Date();
  const windowExpiresAt = new Date(now.getTime() + windowMs);

  try {
    const admin = getAdminClient();

    const { data: existing, error: fetchErr } = await admin
      .from('rate_limit_buckets')
      .select('count, window_start, expires_at')
      .eq('bucket_key', bucketKey)
      .maybeSingle();

    if (fetchErr) {
      console.warn(`[rate-limit] fetch error for ${bucketKey}: ${fetchErr.message}`);
      return { allowed: true, remaining: limit, resetAt: windowExpiresAt };
    }

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

    if (newCount > limit) {
      await admin
        .from('rate_limit_buckets')
        .update({ last_hit_at: now.toISOString() })
        .eq('bucket_key', bucketKey);
      return { allowed: false, remaining: 0, resetAt };
    }

    await admin
      .from('rate_limit_buckets')
      .update({ count: newCount, last_hit_at: now.toISOString() })
      .eq('bucket_key', bucketKey);

    return { allowed: true, remaining: limit - newCount, resetAt };
  } catch (err) {
    console.warn(`[rate-limit] error for ${bucketKey}:`, err?.message);
    return { allowed: true, remaining: limit, resetAt: windowExpiresAt };
  }
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
