import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { awardXP } from '@/lib/rewards';
import { getCourseById, getCoursesByTrack, LEVEL_KEYS } from '@/lib/learning-curriculum';
import { getCourseContent } from '@/lib/learning-content';
import {
  buildProgressMap,
  canAccessCourse,
  isCourseFullyCompleted,
  isLevelComplete,
  levelBadgeKey,
  trackBadgeKey,
  TRACK_BADGE_LABELS,
  LEVEL_BADGE_LABELS,
} from '@/lib/learning-progress-logic';

export const dynamic = 'force-dynamic';

// Every question must be answered correctly to pass.
const PASS_PCT = 100;

function labelForLevelBadgeKey(key) {
  const m = typeof key === 'string' ? key.match(/_level_(.+)$/) : null;
  if (!m) return key;
  return LEVEL_BADGE_LABELS[m[1]] || key;
}

async function syncTrackAndBadges(supabase, userId, course) {
  const { data: rows } = await supabase.from('user_course_progress').select('*').eq('user_id', userId);
  const progressById = buildProgressMap(rows || []);
  const track = course.track;

  await supabase.from('user_track_progress').upsert(
    {
      user_id: userId,
      track,
      basic_completed: isLevelComplete(track, 'basic', progressById),
      intermediate_completed: isLevelComplete(track, 'intermediate', progressById),
      advanced_completed: isLevelComplete(track, 'advanced', progressById),
      expert_completed: isLevelComplete(track, 'expert', progressById),
      current_level: course.level,
    },
    { onConflict: 'user_id,track' }
  );

  const newBadges = [];

  for (const lv of LEVEL_KEYS) {
    if (isLevelComplete(track, lv, progressById)) {
      const key = levelBadgeKey(track, lv);
      if (!key) continue;
      const { error } = await supabase.from('user_learning_badges').insert({ user_id: userId, badge_key: key });
      if (!error) {
        newBadges.push({ key, label: labelForLevelBadgeKey(key) });
      }
    }
  }

  const trackCourses = getCoursesByTrack(track);
  const allTrackDone =
    trackCourses.length > 0 && trackCourses.every((c) => isCourseFullyCompleted(progressById[c.id]));

  if (allTrackDone) {
    const tk = trackBadgeKey(track);
    const { error } = await supabase.from('user_learning_badges').insert({ user_id: userId, badge_key: tk });
    if (!error) {
      newBadges.push({ key: tk, label: TRACK_BADGE_LABELS[track] || tk });
    }
  }

  return newBadges;
}

async function updateBrokerageFlags(supabase, userId, courseId) {
  if (courseId === 'stocks-advanced-3') {
    await supabase
      .from('brokerage_accounts')
      .update({ short_selling_course_completed: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  }
  if (courseId === 'stocks-advanced-4') {
    await supabase
      .from('brokerage_accounts')
      .update({ margin_course_completed: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  }
}

export async function POST(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { courseId, action, answers } = body;

    const course = getCourseById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Invalid course' }, { status: 400 });
    }

    const { data: progressRows } = await supabase.from('user_course_progress').select('*').eq('user_id', user.id);
    const progressById = buildProgressMap(progressRows || []);

    const access = canAccessCourse(course, progressById);
    if (!access.ok) {
      return NextResponse.json({ error: access.reason || 'Course locked' }, { status: 403 });
    }

    const now = new Date().toISOString();

    if (action === 'start') {
      const { data: existing } = await supabase
        .from('user_course_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (existing) {
        const { data: upd, error } = await supabase
          .from('user_course_progress')
          .update({
            status: 'in_progress',
            started_at: existing.started_at || now,
          })
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ progress: upd });
      }

      const { data: ins, error } = await supabase
        .from('user_course_progress')
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: 'in_progress',
          progress_pct: 0,
          reading_complete: false,
          started_at: now,
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ progress: ins });
    }

    if (action === 'reading_complete') {
      const { data: existing } = await supabase
        .from('user_course_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      const { data: upd, error } = await supabase
        .from('user_course_progress')
        .upsert(
          {
            user_id: user.id,
            course_id: courseId,
            status: 'in_progress',
            progress_pct: 100,
            reading_complete: true,
            started_at: existing?.started_at || now,
            quiz_score: existing?.quiz_score ?? null,
            quiz_passed: existing?.quiz_passed ?? null,
          },
          { onConflict: 'user_id,course_id' }
        )
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ progress: upd });
    }

    if (action === 'quiz_submit') {
      const { quiz } = getCourseContent(course);
      const total = Array.isArray(quiz) ? quiz.length : 0;

      if (total === 0) {
        return NextResponse.json({ error: 'This course has no quiz yet.' }, { status: 400 });
      }
      if (!Array.isArray(answers) || answers.length !== total) {
        return NextResponse.json(
          { error: `Please answer all ${total} question${total === 1 ? '' : 's'} before submitting.` },
          { status: 400 }
        );
      }

      let correct = 0;
      const incorrectIndices = [];
      const details = quiz.map((q, i) => {
        const raw = answers[i];
        const userIndex = raw === null || raw === undefined || raw === '' ? -1 : Number(raw);
        const isCorrect = Number.isFinite(userIndex) && userIndex === q.correctIndex;
        if (isCorrect) {
          correct += 1;
        } else {
          incorrectIndices.push(i);
        }
        return { index: i, correct: isCorrect, userIndex, correctIndex: q.correctIndex };
      });

      const scorePct = Math.round((correct / total) * 100);
      const passed = correct === total;

      const { data: existing } = await supabase
        .from('user_course_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (!existing?.reading_complete) {
        return NextResponse.json({ error: 'Mark reading as complete before taking the quiz' }, { status: 400 });
      }

      const row = {
        user_id: user.id,
        course_id: courseId,
        status: passed ? 'completed' : 'in_progress',
        progress_pct: 100,
        reading_complete: true,
        quiz_score: scorePct,
        quiz_passed: passed,
        started_at: existing?.started_at || now,
        completed_at: passed ? now : null,
      };

      const { data: saved, error } = await supabase
        .from('user_course_progress')
        .upsert(row, { onConflict: 'user_id,course_id' })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      let badges = [];
      if (passed) {
        await updateBrokerageFlags(supabase, user.id, courseId);
        badges = await syncTrackAndBadges(supabase, user.id, course);

        try {
          if (!existing?.quiz_passed) {
            await awardXP(user.id, 50, `Completed course quiz: ${course.title}`, 'learning');
          }
          for (const b of badges) {
            if (b.key && /_level_/.test(b.key)) {
              await awardXP(user.id, 200, `Completed track level: ${b.label}`, 'learning');
            }
          }
        } catch (e) {
          console.error('learning progress: awardXP', e);
        }
      }

      return NextResponse.json({
        progress: saved,
        scorePct,
        correct,
        total,
        incorrectIndices,
        details,
        passed,
        passThreshold: PASS_PCT,
        quiz,
        badges,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
