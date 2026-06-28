import { NextResponse } from 'next/server';
import { recordLoginAttempt } from '@/lib/login-lockout';
import { enforceAuthRateLimit } from '@/lib/auth-rate-limit';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const rl = await checkRateLimit(`auth:record-attempt:${getClientIp(request)}`, {
    limit: 20,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);

  const rateLimited = await enforceAuthRateLimit(request, { endpointLabel: 'record-attempt' });
  if (rateLimited) return rateLimited;

  try {
    const { email, success } = await request.json();
    if (!email || typeof email !== 'string' || typeof success !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const result = await recordLoginAttempt(email, ip, success);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[record-attempt]', e);
    return NextResponse.json({ locked: false, attemptsRemaining: 10 }, { status: 500 });
  }
}
