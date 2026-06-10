import { NextResponse } from 'next/server';
import { checkRateLimit } from './persistent-rate-limit';
import { getAuthUser } from './auth-helpers';
import { getClientIp } from './client-ip';
import { isAdminUser } from './admin-helpers';
import { logger } from './logger';
import { logSecurityEvent } from './security-audit';

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
    try {
      const ip = getClientIp(request);

      let path = '';
      try {
        path = new URL(request.url).pathname;
      } catch {
        /* ignore */
      }

      // Resolve the user BEFORE the rate-limit check on protected routes so the
      // per-route limit can be keyed per user. Keying by IP alone meant every
      // user behind a shared office/NAT IP shared one bucket per endpoint and
      // throttled each other during normal use. getAuthUser already runs for
      // protected routes, so this adds no cost.
      let user = null;
      if (requireAuth) {
        user = await getAuthUser(request);
        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      }

      const limit = strict ? 10 : 60;
      const windowMs = 60000;
      const bucketKey = user ? `api:u:${user.id}:${path}` : `api:ip:${ip}:${path}`;
      const { allowed, remaining, resetAt } = await checkRateLimit(bucketKey, limit, windowMs);

      if (!allowed) {
        void logSecurityEvent('rate_limit_hit', {
          ip,
          userId: user?.id || null,
          details: { path },
        });
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

      if (requiredRole && user) {
        // Derive the role only from sources the user cannot forge. NEVER
        // user_metadata — it is user-editable via auth.updateUser({ data }),
        // so trusting it would let any user satisfy a requiredRole gate (and
        // the `=== 'admin'` bypass) by self-assigning a role.
        const trustedRole = user.app_metadata?.role || user.app_metadata?.partner_role || null;
        const admin = isAdminUser(user) || trustedRole === 'admin';
        if (trustedRole !== requiredRole && !admin) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      const response = await handler(request, user, context);
      const res = response instanceof NextResponse ? response : NextResponse.json(response);
      res.headers.set('X-RateLimit-Remaining', String(remaining));
      return res;
    } catch (error) {
      logger.error('API Error', { error: error?.message, stack: error?.stack });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
