import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCourseById } from '@/lib/learning-curriculum';
import { getCourseContent } from '@/lib/learning-content';
import { buildProgressMap, canAccessCourse } from '@/lib/learning-progress-logic';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const courseId = params.courseId;
    const course = getCourseById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const content = getCourseContent(course);

    if (!user) {
      return NextResponse.json({
        course,
        content,
        progress: null,
        unlocked: false,
        reason: 'Sign in to track progress and take quizzes.',
      });
    }

    const { data: progressRows } = await supabase.from('user_course_progress').select('*').eq('user_id', user.id);

    const progressById = buildProgressMap(progressRows || []);
    const access = canAccessCourse(course, progressById);

    const { data: row } = await supabase
      .from('user_course_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle();

    return NextResponse.json({
      course,
      content,
      progress: row,
      unlocked: access.ok,
      unlockReason: access.reason || null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to load course' }, { status: 500 });
  }
}
