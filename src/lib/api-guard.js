import { NextResponse } from 'next/server';
import { rateLimiter } from './rate-limit';
import { getAuthUser } from './auth-helpers';
import { logger } from './logger';

const limiter = rateLimiter({ interval: 60000, limit: 30 });
const strictLimiter = rateLimiter({ interval: 60000, limit: 10 });

export function withApiGuard(handler, options = {}) {
  const { requireAuth = true, strict = false, requiredRole = null } = options;

  return async (request) => {
    try {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
      const activeLimiter = strict ? strictLimiter : limiter;
      const { success, remaining } = activeLimiter.check(ip);

      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' } }
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

      const response = await handler(request, user);
      const res = response instanceof NextResponse ? response : NextResponse.json(response);
      res.headers.set('X-RateLimit-Remaining', String(remaining));
      return res;
    } catch (error) {
      logger.error('API Error', { error: error?.message, stack: error?.stack });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
