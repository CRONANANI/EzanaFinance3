/**
 * GET /api/learning/streak   the caller's current and best learning streak
 *
 * Computed from real activity (course starts, completions and learning ELO
 * events) and saved to user_learning_streaks. Logic: src/lib/learning/hub-server.js.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { getLearningStreak } from '@/lib/learning/hub-server';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    try {
      return NextResponse.json(await getLearningStreak(getAdminClient(), user.id), {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    } catch (err) {
      console.error('[learning/streak]', err);
      return NextResponse.json({ error: 'Failed to fetch streak' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
