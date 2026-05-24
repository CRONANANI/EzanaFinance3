import { NextResponse } from 'next/server';
import { getUserClient } from '@/lib/supabase';
import { getCourseById } from '@/lib/learning-curriculum';

export const dynamic = 'force-dynamic';

function rewardForLevel(level) {
  if (level === 'expert' || level === 'advanced') return 25;
  if (level === 'intermediate') return 20;
  return 15;
}

export async function GET() {
  try {
    const supabase = getUserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: rows } = await supabase
      .from('user_course_bookmarks')
      .select('course_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const bookmarks = (rows || [])
      .map((r) => {
        const course = getCourseById(r.course_id);
        if (!course) return null;
        return {
          course_id: r.course_id,
          title: course.title,
          track: course.track,
          level: course.level,
          duration_minutes: course.duration_minutes,
          reward_elo: rewardForLevel(course.level),
          created_at: r.created_at,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ bookmarks });
  } catch (err) {
    console.error('[learning/bookmarks GET]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = getUserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const courseId = body?.courseId?.trim();
    const action = body?.action;

    if (!courseId || !getCourseById(courseId)) {
      return NextResponse.json({ error: 'Invalid courseId' }, { status: 400 });
    }
    if (!['add', 'remove'].includes(action)) {
      return NextResponse.json({ error: 'action must be add|remove' }, { status: 400 });
    }

    if (action === 'add') {
      await supabase.from('user_course_bookmarks').upsert({
        user_id: user.id,
        course_id: courseId,
      });
    } else {
      await supabase
        .from('user_course_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[learning/bookmarks POST]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
