import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { awardXP } from '@/lib/rewards';

export const dynamic = 'force-dynamic';

/** Idempotent: one 50 XP award per checklist task per user, enforced by the
    award_xp key checklist:<task> (a unique index, not a read-then-write). */
export const POST = withApiGuard(
  async (request, user) => {
    try {
      const body = await request.json();
      const taskId = typeof body.taskId === 'string' ? body.taskId.trim().slice(0, 80) : '';
      if (!taskId) {
        return NextResponse.json({ error: 'taskId required' }, { status: 400 });
      }
      const result = await awardXP(
        user.id,
        50,
        `Checklist task: ${taskId}`,
        'engagement',
        `checklist:${taskId}`,
      );
      if (!result) return NextResponse.json({ error: 'Could not award XP' }, { status: 500 });
      return result.awarded
        ? NextResponse.json({ ok: true })
        : NextResponse.json({ ok: true, skipped: true });
    } catch (e) {
      console.error('checklist-task XP:', e);
      return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
