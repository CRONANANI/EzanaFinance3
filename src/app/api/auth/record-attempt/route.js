import { NextResponse } from 'next/server';
import { recordLoginAttempt } from '@/lib/login-lockout';
import { enforceAuthRateLimit } from '@/lib/auth-rate-limit';
import { getClientIp } from '@/lib/client-ip';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const rateLimited = await enforceAuthRateLimit(request, { endpointLabel: 'record-attempt' });
  if (rateLimited) return rateLimited;

  try {
    const { email, success } = await request.json();
    if (!email || typeof email !== 'string' || typeof success !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const ip = getClientIp(request);

    const result = await recordLoginAttempt(email, ip, success);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[record-attempt]', e);
    return NextResponse.json({ locked: false, attemptsRemaining: 10 }, { status: 500 });
  }
}
