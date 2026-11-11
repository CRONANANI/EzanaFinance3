import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { isViewTaskId } from '@/lib/onboarding/checklistConfig';
import { completeChecklistTask } from '@/lib/onboarding/completeTask';

export const dynamic = 'force-dynamic';

/**
 * POST { taskId }: record a page-view task (open a member profile, a company
 * profile, an Echo article, peer comparison, sector exposure, mock P&L).
 * A page view can only be reported by the browser, so only the ids in
 * VIEW_TASK_IDS are accepted; every other task is completed by the server
 * code that proves it.
 */
export const POST = withApiGuard(
  async (request, user) => {
    const body = await request.json().catch(() => ({}));
    const taskId = typeof body?.taskId === 'string' ? body.taskId : '';
    if (!isViewTaskId(taskId)) {
      return NextResponse.json({ error: 'Unknown task' }, { status: 400 });
    }
    const res = await completeChecklistTask(user.id, taskId, 'view');
    return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : 500 });
  },
  { requireAuth: true },
);
