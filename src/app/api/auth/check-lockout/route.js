import { NextResponse } from 'next/server';
import { isLockedOut } from '@/lib/login-lockout';
import { enforceAuthRateLimit } from '@/lib/auth-rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const rateLimited = await enforceAuthRateLimit(request, { endpointLabel: 'check-lockout' });
  if (rateLimited) return rateLimited;

  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const locked = await isLockedOut(email);
    if (locked) {
      return NextResponse.json(
        {
          error:
            'Account temporarily locked due to too many failed login attempts. Try again in 1 hour or contact support.',
        },
        { status: 423 },
      );
    }

    return NextResponse.json({ locked: false });
  } catch (e) {
    console.error('[check-lockout]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
