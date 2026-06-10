/**
 * Auth-specific rate limiter — 5 attempts per 15 minutes per IP.
 *
 * Used on auth endpoints: send-verification, verify-code, activate-free.
 * Logs every limit hit to security_audit_log for forensic visibility.
 */

import { NextResponse } from 'next/server';
import { checkRateLimit, logSecurityEvent } from './persistent-rate-limit';
import { getClientIp } from './client-ip';

const AUTH_LIMIT = 5;
const AUTH_WINDOW_MS = 15 * 60 * 1000;

/**
 * Check the auth rate limit. Returns:
 *   - null if the request should proceed
 *   - a NextResponse 429 if the request should be blocked
 */
export async function enforceAuthRateLimit(request, options = {}) {
  const { endpointLabel = 'auth' } = options;
  const ip = getClientIp(request);
  const bucketKey = `auth:${ip}`;

  const result = await checkRateLimit(bucketKey, AUTH_LIMIT, AUTH_WINDOW_MS);

  if (!result.allowed) {
    let endpoint = endpointLabel;
    try {
      endpoint = new URL(request.url).pathname;
    } catch {
      /* ignore */
    }

    await logSecurityEvent('auth_rate_limit_hit', {
      severity: 'warning',
      ip,
      endpoint,
      details: {
        limit: AUTH_LIMIT,
        windowMs: AUTH_WINDOW_MS,
        resetAt: result.resetAt.toISOString(),
      },
    });

    const retryAfterSec = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: retryAfterSec,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(retryAfterSec, 1)),
          'X-RateLimit-Limit': String(AUTH_LIMIT),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toISOString(),
        },
      },
    );
  }

  return null;
}
