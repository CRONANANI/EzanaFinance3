import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { TRACKS } from '@/lib/learning-curriculum';
import { buildProgressMap, computeTrackSummary } from '@/lib/learning-progress-logic';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ tracks: TRACKS.map((t) => ({ ...t, summary: null })), authenticated: false });
    }

    const { data: progressRows } = await supabase.from('user_course_progress').select('*').eq('user_id', user.id);

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
}
