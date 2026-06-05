import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

/**
 * Public VAPID key for service worker (pushsubscriptionchange) and client subscribe.
 */
export const GET = withApiGuard(
  async (request, user) => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return NextResponse.json({ error: 'VAPID not configured' }, { status: 503 });
    }
    return NextResponse.json({ publicKey });
  },
  { requireAuth: false },
);
