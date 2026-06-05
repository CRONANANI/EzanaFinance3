import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabaseClient } from '@/lib/supabase-service-role';
import { awardXP } from '@/lib/rewards';

export const dynamic = 'force-dynamic';

/** Idempotent: one 50 XP award per checklist task per user */
export const POST = withApiGuard(
  async (request, user) => {
    try {
      const body = await request.json();
      const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : '';
      if (!taskId) {
        return NextResponse.json({ error: 'taskId required' }, { status: 400 });
      }

      const admin = createServerSupabaseClient();
      const reason = `Checklist task: ${taskId}`;

      const { data: existing } = await admin
        .from('xp_transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('reason', reason)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ ok: true, skipped: true });
      }

      await awardXP(user.id, 50, reason, 'engagement');
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error('checklist-task XP:', e);
      return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
