import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-service-role';
import { awardELO } from '@/lib/elo';
import { getCourseById } from '@/lib/learning-curriculum';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const ADMIN_SECRET = process.env.ADMIN_LOCK_SECRET;

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

/** @type {string} */
const BACKFILL_MARKER = '__ELO_BACKFILL_COMPLETE__';

/**
 * POST /api/admin/elo/backfill
 * Idempotency: inserts a row with reason '__ELO_BACKFILL_COMPLETE__' per user when done.
 * Auth: Bearer ADMIN_LOCK_SECRET.
 * Body: { dryRun?: boolean, userIds?: string[] }
 */
export async function POST(request) {
  const authHeader = request.headers.get('authorization') || '';
  const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!ADMIN_SECRET || provided !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const dryRun = body?.dryRun === true;
  const userIdsFilter = Array.isArray(body?.userIds) ? body.userIds : null;

  if (userIdsFilter && userIdsFilter.length === 0) {
    return NextResponse.json({
      success: true,
      dryRun,
      processed: 0,
      skipped: 0,
      totalEloAwarded: 0,
      errors: [],
      message: 'userIds was empty — nothing to do',
    });
  }

  const supabase = createServerSupabaseClient();

  try {
    let usersQuery = supabase.from('user_elo').select('user_id');
    if (userIdsFilter) {
      usersQuery = usersQuery.in('user_id', userIdsFilter);
    }
    const { data: usersData, error: usersErr } = await usersQuery;
    if (usersErr) throw usersErr;

    let processed = 0;
    let skipped = 0;
    let totalEloAwarded = 0;
    const errors = [];
    const detailReport = [];

    for (const u of usersData || []) {
      const userId = u.user_id;

      const { data: marker } = await supabase
        .from('elo_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('reason', BACKFILL_MARKER)
        .maybeSingle();

      if (marker) {
        skipped += 1;
        continue;
      }

      const { data: completions, error: cErr } = await supabase
        .from('user_course_progress')
        .select('course_id')
        .eq('user_id', userId)
        .eq('quiz_passed', true);

      if (cErr) {
        errors.push({ userId, error: cErr.message });
        continue;
      }

      let userElo = 0;
      const userBreakdown = { basic: 0, intermediate: 0, advanced: 0, expert: 0 };

      for (const c of completions || []) {
        const course = getCourseById(c.course_id);
        if (!course?.level) continue;

        const eloDelta = ELO_PER_COURSE_LEVEL[course.level] || 0;
        if (eloDelta > 0) {
          userElo += eloDelta;
          userBreakdown[course.level] = (userBreakdown[course.level] || 0) + 1;
        }
      }

      detailReport.push({
        userId,
        coursesCompleted: completions?.length || 0,
        breakdown: userBreakdown,
        eloEarned: userElo,
      });

      if (userElo === 0) {
        if (!dryRun) {
          const { data: eloRow } = await supabase
            .from('user_elo')
            .select('current_rating')
            .eq('user_id', userId)
            .maybeSingle();
          const rNow = eloRow?.current_rating ?? 0;
          const { error: mErr } = await supabase.from('elo_transactions').insert({
            user_id: userId,
            delta: 0,
            reason: BACKFILL_MARKER,
            category: 'admin',
            metadata: { eloAwarded: 0, courseCount: completions?.length || 0 },
            rating_before: rNow,
            rating_after: rNow,
          });
          if (mErr) errors.push({ userId, error: mErr.message });
        }
        skipped += 1;
        continue;
      }

      if (dryRun) {
        totalEloAwarded += userElo;
        processed += 1;
        continue;
      }

      const nCourses = completions?.length ?? 0;
      const result = await awardELO(
        userId,
        userElo,
        `Backfill: ${nCourses} courses completed pre-launch`,
        'learning',
        {
          backfill: true,
          breakdown: userBreakdown,
          coursesCompleted: nCourses,
        }
      );

      if (!result) {
        errors.push({ userId, error: 'awardELO returned null' });
        continue;
      }

      const { error: mErr } = await supabase.from('elo_transactions').insert({
        user_id: userId,
        delta: 0,
        reason: BACKFILL_MARKER,
        category: 'admin',
        metadata: { eloAwarded: userElo, courseCount: nCourses },
        rating_before: result.newRating,
        rating_after: result.newRating,
      });
      if (mErr) errors.push({ userId, error: mErr.message });

      totalEloAwarded += userElo;
      processed += 1;
    }

    return NextResponse.json({
      success: true,
      dryRun,
      processed,
      skipped,
      totalEloAwarded,
      errors,
      ...(dryRun && { detailReport }),
    });
  } catch (err) {
    console.error('[elo/backfill] unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Backfill failed' }, { status: 500 });
  }
}
