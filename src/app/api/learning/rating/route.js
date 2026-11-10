/**
 * GET /api/learning/rating   the caller's LearningELO
 *
 * { scope, rating, byTrack, change7d, history: [{ date, rating, delta, reasons }], network }
 * LearningELO is the sum of the caller's learning ELO events; the history's
 * last point is the current rating. Logic: src/lib/learning/hub-server.js.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { getLearningRating } from '@/lib/learning/hub-server';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    try {
      return NextResponse.json(await getLearningRating(getAdminClient(), user.id), {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    } catch (err) {
      console.error('[learning/rating]', err);
      return NextResponse.json({ error: 'Failed to load rating' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
