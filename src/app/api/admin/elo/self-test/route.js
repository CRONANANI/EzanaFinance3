import { NextResponse } from 'next/server';
import { awardELO, getUserEloState, tierForRating } from '@/lib/elo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_SECRET = process.env.ADMIN_LOCK_SECRET;

/**
 * GET /api/admin/elo/self-test?userId=<uuid>
 *
 * Smoke test: applies +50 ELO, then -25 ELO, returns full state.
 * Auth: same bearer pattern as other admin routes.
 */
export async function GET(request) {
  const authHeader = request.headers.get('authorization') || '';
  const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!ADMIN_SECRET || provided !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId query param required' }, { status: 400 });
  }

  const r1 = await awardELO(userId, 50, 'ELO self-test +50', 'admin', { test: true });
  const r2 = await awardELO(userId, -25, 'ELO self-test -25', 'admin', { test: true });
  const state = await getUserEloState(userId, 5);

  return NextResponse.json({
    pureFn_tierForRating: {
      0: tierForRating(0),
      999: tierForRating(999),
      1000: tierForRating(1000),
      2500: tierForRating(2500),
      5000: tierForRating(5000),
      7000: tierForRating(7000),
      8500: tierForRating(8500),
      10000: tierForRating(10000),
    },
    award1: r1,
    award2: r2,
    finalState: state,
  });
}
