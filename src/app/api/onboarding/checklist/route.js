import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { deriveChecklist } from '@/lib/onboarding/checklistConfig';
import { reconcileChecklist } from '@/lib/onboarding/completeTask';

export const dynamic = 'force-dynamic';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

/**
 * GET: the signed-in user's completed checklist task ids plus the summary.
 * Before answering it records any task the user's own data already proves
 * (src/lib/onboarding/completeTask.js), so progress made elsewhere shows up
 * the next time the panel opens.
 *
 * There is deliberately no POST here: tasks are completed server-side by
 * the feature that owns them, because the checklist gates live trading.
 * Page views go through ./view, which accepts only page-view task ids.
 */
export const GET = withApiGuard(
  async (_request, user) => {
    try {
      const completed = await reconcileChecklist(user.id, { user });
      const summary = deriveChecklist(completed);
      return NextResponse.json(
        {
          completed,
          doneCount: summary.doneCount,
          total: summary.total,
          xp: summary.xp,
          liveTradingUnlocked: summary.liveTradingUnlocked,
        },
        { headers: PRIVATE },
      );
    } catch (e) {
      console.error('[checklist] GET failed', e?.message || e);
      return NextResponse.json(
        { error: 'Could not load checklist' },
        { status: 500, headers: PRIVATE },
      );
    }
  },
  { requireAuth: true },
);
