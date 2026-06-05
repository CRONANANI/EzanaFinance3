import { NextResponse } from 'next/server';
import { checkRateLimit } from './persistent-rate-limit';
import { getAuthUser } from './auth-helpers';
import { logger } from './logger';
import { logSecurityEvent } from './security-audit';

export function withApiGuard(handler, options = {}) {
  const { requireAuth = true, strict = false, requiredRole = null } = options;

  return async (request, context) => {
    try {
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';

      let path = '';
      try {
        path = new URL(request.url).pathname;
      } catch {
        /* ignore */
      }

      const limit = strict ? 10 : 30;
      const windowMs = 60000;
      const bucketKey = `api:${ip}:${path}`;
      const { allowed, remaining, resetAt } = await checkRateLimit(bucketKey, limit, windowMs);

      if (!allowed) {
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

      let user = null;
      if (requireAuth) {
        user = await getAuthUser(request);
        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      }

      if (requiredRole && user) {
        const role = user.user_metadata?.role || user.user_metadata?.partner_role;
        if (role !== requiredRole && role !== 'admin') {
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
