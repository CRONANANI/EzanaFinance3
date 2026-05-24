import { NextResponse } from 'next/server';
import { getUserClient } from '@/lib/supabase';
import { ALL_COURSES } from '@/lib/learning-curriculum';
import {
  buildProgressMap,
  getOrderedCoursesForTrack,
  isCourseFullyCompleted,
} from '@/lib/learning-progress-logic';

export const dynamic = 'force-dynamic';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function pickPrimaryCourse(progressById, userMainTrack) {
  const track = userMainTrack || 'stocks';
  const ordered = getOrderedCoursesForTrack(track);
  for (const c of ordered) {
    if (!isCourseFullyCompleted(progressById[c.id])) return c.id;
  }
  for (const c of ALL_COURSES) {
    if (!isCourseFullyCompleted(progressById[c.id])) return c.id;
  }
  return null;
}

function buildBonusQuests() {
  return [
    {
      id: 'q1',
      type: 'finish_lessons',
      label: 'Finish 2 lessons today',
      target: 2,
      progress: 0,
      reward_elo: 10,
      done: false,
    },
    {
      id: 'q2',
      type: 'pass_friend',
      label: 'Pass a friend on the leaderboard',
      target: 1,
      progress: 0,
      reward_elo: 20,
      done: false,
    },
    {
      id: 'q3',
      type: 'try_track',
      label: 'Try a different track',
      target: 1,
      progress: 0,
      reward_elo: 5,
      done: false,
    },
  ];
}

function midnightTonightISO() {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.toISOString();
}

export async function GET() {
  try {
    const supabase = getUserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const today = todayISO();

    const { data: existing } = await supabase
      .from('user_daily_quests')
      .select('*')
      .eq('user_id', user.id)
      .eq('quest_date', today)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        primary: { course_id: existing.primary_course_id },
        bonus: existing.bonus_quests,
        resets_at: midnightTonightISO(),
      });
    }

    const { data: progress } = await supabase
      .from('user_course_progress')
      .select('*')
      .eq('user_id', user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_settings')
      .eq('id', user.id)
      .maybeSingle();

    const mainTrack = profile?.user_settings?.learning_main_track || 'stocks';
    const progressById = buildProgressMap(progress || []);
    const primaryCourseId = pickPrimaryCourse(progressById, mainTrack);
    const bonus = buildBonusQuests();

    await supabase.from('user_daily_quests').upsert({
      user_id: user.id,
      quest_date: today,
      primary_course_id: primaryCourseId,
      bonus_quests: bonus,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      primary: { course_id: primaryCourseId },
      bonus,
      resets_at: midnightTonightISO(),
    });
  } catch (err) {
    console.error('[learning/quests/daily]', err);
    return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
  }
}
