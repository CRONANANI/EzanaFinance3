import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserEloState, reconcileLearningElo } from '@/lib/elo';
import { isValidUuid } from '@/lib/uuid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/elo/user/:userId
 *
 * Returns public ELO state for any user. Caller must be authenticated;
 * rows are readable per RLS for elo_transactions / user_elo.
 *
 * @param {number} transactionLimit - 30 for sparkline + breakdown on profiles
 */
export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    try {
      const userId = params?.userId;
      if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
      }
      if (!isValidUuid(userId)) {
        return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
      }

      await reconcileLearningElo(userId);

      const state = await getUserEloState(userId, 30);
      if (!state) {
        return NextResponse.json({ error: 'Failed to fetch ELO state' }, { status: 500 });
      }

      return NextResponse.json(state);
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  },
  { requireAuth: true },
);
