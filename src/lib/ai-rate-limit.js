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
