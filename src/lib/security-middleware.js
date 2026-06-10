/**
 * Lightweight security wrapper for API routes that need auth + rate limiting
 * but don't use the full withApiGuard pattern.
 */

import { NextResponse } from 'next/server';
import { getClientIp } from './client-ip';

const rateLimitMap = new Map();
const WINDOW_MS = 60_000;
const CLEANUP_INTERVAL = 5 * 60_000;

if (typeof globalThis !== 'undefined' && !globalThis.__secMwCleanup) {
  globalThis.__secMwCleanup = setInterval(() => {
    const cutoff = Date.now() - CLEANUP_INTERVAL;
    for (const [key, entry] of rateLimitMap) {
      if (entry.windowStart < cutoff) rateLimitMap.delete(key);
    }
  }, CLEANUP_INTERVAL);
}

function getIp(request) {
  return getClientIp(request);
}

function checkRateLimit(ip, limit = 30) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

/**
 * Wrap an API handler with authentication.
 */
export function withAuth(handler, options = {}) {
  const { rateLimit = 30 } = options;

  return async (request, context) => {
    const ip = getIp(request);
    if (!checkRateLimit(ip, rateLimit)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }

    try {
      const { createServerSupabase } = await import('@/lib/supabase-server');
      const supabase = createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      return handler(request, user, context);
    } catch (err) {
      console.error('[security-middleware] Auth check failed:', err?.message);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
  };
}

/**
 * Strict rate limit wrapper — for expensive endpoints (AI, external APIs).
 */
export function withStrictAuth(handler) {
  return withAuth(handler, { rateLimit: 10 });
}
