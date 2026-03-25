import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { ALL_COURSES, TRACKS, getTotalCourses } from '@/lib/learning-curriculum';
import { buildProgressMap, computeTrackSummary } from '@/lib/learning-progress-logic';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let progressRows = [];
    let badges = [];
    if (user) {
      const { data, error } = await supabase
        .from('user_course_progress')
        .select('*')
        .eq('user_id', user.id);
      if (error) {
        console.error('learning courses progress:', error);
      } else {
        progressRows = data || [];
      }
      const { data: badgeRows } = await supabase.from('user_learning_badges').select('*').eq('user_id', user.id);
      badges = badgeRows || [];
    }

    const progressById = buildProgressMap(progressRows);
    const total = getTotalCourses();
    const completed = progressRows.filter((r) => r.status === 'completed' && r.quiz_passed === true).length;

    const courses = ALL_COURSES.map((c) => ({
      ...c,
      progress: progressById[c.id] || null,
    }));

    const tracks = TRACKS.map((t) => ({
      ...t,
      summary: computeTrackSummary(t.id, progressById),
    }));

    return NextResponse.json({
      courses,
      progress: progressRows,
      progressById,
      badges,
      overall: { completed, total, pct: total ? Math.round((completed / total) * 100) : 0 },
      tracks,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to load learning data' }, { status: 500 });
  }
}
