import { NextResponse } from 'next/server';
import { getUserClient } from '@/lib/supabase';
import { getUserEloState, awardELO } from '@/lib/elo';
import { getCourseById } from '@/lib/learning-curriculum';

/** Same deltas as PATCH /api/learning/progress course completion. */
const ELO_PER_COURSE_LEVEL = {
  basic: 15,
  intermediate: 20,
  advanced: 25,
  expert: 25,
};

const LEVEL_TO_TIER_NAME = {
  basic: 'bronze',
  intermediate: 'silver',
  advanced: 'gold',
  expert: 'platinum',
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/elo/me — authenticated user's ELO + recent transactions (session cookie).
 */
export async function GET() {
  const supabase = getUserClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let state = await getUserEloState(user.id, 50);
  if (!state) {
    return NextResponse.json({ error: 'Failed to fetch ELO state' }, { status: 500 });
  }

  const hasLearningElo = (state.transactions || []).some((t) => t.category === 'learning');

  if (!hasLearningElo) {
    try {
      const sb = getUserClient();

      const { data: progress } = await sb
        .from('user_course_progress')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .eq('quiz_passed', true);

      if (progress && progress.length > 0) {
        for (const p of progress) {
          const course = getCourseById(p.course_id);
          if (!course) continue;
          const points = ELO_PER_COURSE_LEVEL[course.level] || 15;
          const tierName = LEVEL_TO_TIER_NAME[course.level] || 'bronze';
          await awardELO(
            user.id,
            points,
            `Completed ${tierName} course: ${course.title} (retroactive)`,
            'learning',
            { course_id: p.course_id, retroactive: true, level: course.level, tier: tierName },
          ).catch(() => {});
        }
        state = (await getUserEloState(user.id, 50)) || state;
      }
    } catch (e) {
      console.warn('[elo/me] retroactive credit failed:', e);
    }
  }

  return NextResponse.json(state);
}
