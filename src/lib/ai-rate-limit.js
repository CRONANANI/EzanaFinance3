/**
 * Per-user limits for routes that spend Anthropic credit (reliability audit
 * P2-12): 10 requests a minute and a daily cap per user per route, on the
 * shared database limiter (not a per-instance Map), failing CLOSED when the
 * limiter is down so spend is always capped.
 *
 *   const blocked = await enforceAiRateLimit(user.id, 'ai-stock-analysis');
 *   if (blocked) return blocked;
 */
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/persistent-rate-limit';

export const AI_PER_MINUTE = 10;
export function aiDailyCap() {
  return Math.max(1, Number(process.env.AI_DAILY_CAP_PER_USER) || 100);
}

export async function enforceAiRateLimit(userId, route) {
  const who = userId || 'anon';
  const minute = await checkRateLimit(`ai:${route}:${who}`, AI_PER_MINUTE, 60_000, {
    failClosed: true,
  });
  if (!minute.allowed)
    return blockedResponse(minute, 'Rate limit exceeded. Try again in 60 seconds.');
  const day = await checkRateLimit(`ai-day:${route}:${who}`, aiDailyCap(), 86_400_000, {
    failClosed: true,
  });
  if (!day.allowed)
    return blockedResponse(day, 'Daily limit reached for this feature. It resets within 24 hours.');
  return null;
}

function blockedResponse(rl, message) {
  if (rl.degraded) {
    return NextResponse.json(
      { error: 'Service temporarily unavailable. Please try again shortly.' },
      { status: 503, headers: { 'Retry-After': '30' } },
    );
  }
  const retry = Math.max(1, Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000));
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { 'Retry-After': String(retry) } },
  );
}

/* Global daily model-call budgets (security assessment F-07). A per-user cap
   does not bound total spend: many accounts, or a public route, can still run
   the bill up. These count MODEL CALLS (cache misses), not requests, across
   every user, per UTC day, and fail closed. Override per route with
   AI_GLOBAL_DAILY_CAP_<ROUTE> (route upper-cased, '-' and '/' as '_'). */
export const GLOBAL_DAILY_DEFAULTS = {
  'event-context': 2000,
  'award-analysis': 1000,
};

export function globalDailyCap(route) {
  const envKey = `AI_GLOBAL_DAILY_CAP_${route.toUpperCase().replace(/[-/]/g, '_')}`;
  const fromEnv = Number(process.env[envKey]);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return Math.floor(fromEnv);
  return GLOBAL_DAILY_DEFAULTS[route] ?? 500;
}

/**
 * Reserve one model call against the route's global daily budget.
 * @returns {Promise<boolean>} true when the call may go ahead.
 */
export async function reserveGlobalAiCall(route) {
  const day = new Date().toISOString().slice(0, 10);
  const rl = await checkRateLimit(`ai-global:${route}:${day}`, globalDailyCap(route), 86_400_000, {
    failClosed: true,
  });
  if (!rl.allowed) {
    console.warn(`[ai-budget] ${route}: global daily budget exhausted or limiter down`);
  }
  return rl.allowed;
}
