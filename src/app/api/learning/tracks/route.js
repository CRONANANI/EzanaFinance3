import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { TRACKS } from '@/lib/learning-curriculum';
import { buildProgressMap, computeTrackSummary } from '@/lib/learning-progress-logic';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async () => {
    try {
      const supabase = getUserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({
          tracks: TRACKS.map((t) => ({ ...t, summary: null })),
          authenticated: false,
        });
      }

      const { data: progressRows } = await supabase
        .from('user_course_progress')
        .select('*')
        .eq('user_id', user.id);

      const progressById = buildProgressMap(progressRows || []);

      const tracks = TRACKS.map((t) => ({
        ...t,
        summary: computeTrackSummary(t.id, progressById),
      }));

      return NextResponse.json({ tracks, authenticated: true });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: 'Failed to load tracks' }, { status: 500 });
    }
  },
  { requireAuth: false },
);
