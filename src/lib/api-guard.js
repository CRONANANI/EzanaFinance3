import { NextResponse } from 'next/server';
import { checkRateLimit } from './persistent-rate-limit';
import { getAuthUser } from './supabase';
import * as Sentry from '@sentry/nextjs';
import { logger, requestIdOf } from './logger';
import { logSecurityEvent } from './security-audit';
import { getClientIp } from './client-ip';
import { routePattern } from './route-pattern';

export { routePattern };

/* Routes whose limiter must fail CLOSED when the limiter itself is down:
   auth, AI, Sonar and the public API (reliability audit P2-12). */
const FAIL_CLOSED = [
  /^\/api\/auth\//,
  /^\/api\/v1\//,
  /^\/api\/sonar\//,
  /^\/api\/(ai-|research\/|centaur\/|ezanaql\/generate|help-center\/ask|market-opportunities\/analyze|market-data\/analyze-event|market-data\/event-context|gov-contracts\/award-analysis)/,
];
/* Never rate limited: uptime monitors must always get an answer. */
const EXEMPT = [/^\/api\/(health|healthz|readyz)(\/|$)/];

/**
 * Build an error response without leaking internal details to the client.
 * The real error is logged server-side; the client receives a generic message
 * (the raw message is only included when NODE_ENV !== 'production', to aid
 * local debugging). Use this instead of `NextResponse.json({ error: e.message })`.
 *
 * @param {unknown} error
 * @param {object} [opts]
 * @param {number} [opts.status=500]
 * @param {string} [opts.message='Internal server error']
 * @param {string} [opts.context]
 */
export function safeErrorResponse(error, opts = {}) {
  const { status = 500, message = 'Internal server error', context } = opts;
  const detail = error instanceof Error ? error.message : String(error ?? '');
  logger.error(context || 'API Error', { error: detail, stack: error?.stack });
  const body = { error: message };
  if (process.env.NODE_ENV !== 'production' && detail) body.detail = detail;
  return NextResponse.json(body, { status });
}

export function withApiGuard(handler, options = {}) {
  const { requireAuth = true, strict = false, requiredRole = null } = options;

  return async (request, context) => {
    const requestId = requestIdOf(request);
    if (requestId) {
      try {
        Sentry.getIsolationScope().setTag('request_id', requestId);
      } catch {
        /* Sentry not initialised */
      }
    }
    try {
      const ip = getClientIp(request) || 'unknown';

      let path = '';
      try {
        path = new URL(request.url).pathname;
      } catch {
        /* ignore */
      }

      let remaining = null;
      if (!EXEMPT.some((re) => re.test(path))) {
        const limit = strict ? 10 : 30;
        const windowMs = 60000;
        const pattern = routePattern(path, context?.params);
        const failClosed = options.failClosed ?? FAIL_CLOSED.some((re) => re.test(path));
        const rl = await checkRateLimit(`api:${ip}:${pattern}`, limit, windowMs, { failClosed });
        remaining = rl.remaining;
        if (!rl.allowed) {
          if (rl.degraded) {
            return NextResponse.json(
              { error: 'Service temporarily unavailable. Please try again shortly.' },
              { status: 503, headers: { 'Retry-After': '30' } },
            );
          }
          const { resetAt } = rl;
          void logSecurityEvent('rate_limit_hit', { ip, details: { path } });
          const retryAfterSec = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
          return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            {
              status: 429,
              headers: {
                'Retry-After': String(retryAfterSec),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': resetAt.toISOString(),
              },
            },
          );
        }
      }

      let user = null;
      if (requireAuth) {
        user = await getAuthUser(request);
        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      }

      if (requiredRole && user) {
        // SECURITY: only app_metadata is trusted — user_metadata is writable
        // by the user themselves via supabase.auth.updateUser(), so reading a
        // role from it would be a self-service privilege escalation.
        const role = user.app_metadata?.role || user.app_metadata?.partner_role;
        if (role !== requiredRole && role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      const response = await handler(request, user, context);
      const res = response instanceof NextResponse ? response : NextResponse.json(response);
      if (remaining != null) res.headers.set('X-RateLimit-Remaining', String(remaining));
      return res;
    } catch (error) {
      logger.error('API Error', { requestId, error: error?.message, stack: error?.stack });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
