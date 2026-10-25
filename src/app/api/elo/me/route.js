import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserEloState } from '@/lib/elo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/elo/me: the signed-in user's ELO and recent transactions. Read
 * only: learning ELO is reconciled on the learning-progress POST and by the
 * nightly reconcile-learning-elo cron, never on a page load.
 */
export const GET = withApiGuard(
  async (request, user) => {
    const state = await getUserEloState(user.id, 50);
    if (!state) {
      return NextResponse.json({ error: 'Failed to fetch ELO state' }, { status: 500 });
    }

    return NextResponse.json(state);
  },
  { requireAuth: true },
);
