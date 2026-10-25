import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase';
import { getLoginAttemptsClient, recordLoginSuccess } from '@/lib/login-lockout';
import { enforceAuthRateLimit } from '@/lib/auth-rate-limit';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/*
 * QA RET-9: records a successful sign-in for the AUTHENTICATED caller only.
 * The email comes from the session, never the body, and client-reported
 * failures are no longer accepted (they let anyone lock a victim's sign-in).
 * An unauthenticated call is a 401 and records nothing.
 */
export async function POST(request) {
  const rl = await checkRateLimit(`auth:record-attempt:${getClientIp(request)}`, {
    limit: 20,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);

  const rateLimited = await enforceAuthRateLimit(request, { endpointLabel: 'record-attempt' });
  if (rateLimited) return rateLimited;

  try {
    const user = await getCurrentUser(request);
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const result = await recordLoginSuccess(getLoginAttemptsClient(), {
      email: user.email,
      ip: getClientIp(request),
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error('[record-attempt]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
