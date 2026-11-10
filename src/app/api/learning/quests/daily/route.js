/**
 * GET /api/learning/quests/daily   today's Learning Center quest
 *
 * Progress on each task is computed on the server from the caller's own
 * course progress and learning ELO; rewards are awarded here once per task
 * per day. The client cannot tick a task. Logic: src/lib/learning/hub-server.js.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { getDailyQuest } from '@/lib/learning/hub-server';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    try {
      return NextResponse.json(await getDailyQuest(getAdminClient(), user.id), {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    } catch (err) {
      console.error('[learning/quests/daily]', err);
      return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
