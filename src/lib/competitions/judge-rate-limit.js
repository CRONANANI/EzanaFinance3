/**
 * Per-judge-token rate limit for the /api/competitions/judge/* routes
 * (QA ORG-5). Judges at a pitch event often share one venue Wi-Fi IP, so the
 * per-IP limit throttles a whole room; the token is the real identity.
 * Keyed by the token's SHA-256 (the raw token never reaches the bucket table).
 */
import { checkRateLimit } from '@/lib/persistent-rate-limit';
import { hashToken } from '@/lib/competitions/judge-token';

export const JUDGE_RATE_LIMIT = 120;
export const JUDGE_RATE_WINDOW_MS = 60_000;

/** True when this token has used up its 120 requests for the current minute. */
export async function judgeRateLimited(rawToken, check = checkRateLimit) {
  if (!rawToken || typeof rawToken !== 'string') return false;
  const res = await check(`judge:${hashToken(rawToken)}`, JUDGE_RATE_LIMIT, JUDGE_RATE_WINDOW_MS);
  return res?.allowed === false;
}
