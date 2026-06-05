import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getCurrentUser, getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function utcYmd(d) {
  return d.toISOString().split('T')[0];
}

function addUtcDays(date, delta) {
  const x = new Date(date);
  x.setUTCDate(x.getUTCDate() + delta);
  return x;
}

function computeStreakFromDates(dateSet) {
  let streakDays = 0;
  let d = new Date();
  let key = utcYmd(d);
  // If today isn't recorded yet, start counting from yesterday
  if (!dateSet.has(key)) {
    d = addUtcDays(d, -1);
    key = utcYmd(d);
  }
  while (dateSet.has(key)) {
    streakDays += 1;
    d = addUtcDays(d, -1);
    key = utcYmd(d);
  }
  return streakDays;
}

/**
 * Check if the table exists by attempting a lightweight query.
 * Returns true if the table is accessible, false if it doesn't exist.
 */
async function tableExists(supabase) {
  const { error } = await supabase
    .from('user_login_history')
    .select('id', { count: 'exact', head: true })
    .limit(0);

  if (!error) return true;
  if (error.code === '42P01' || error.message?.includes('does not exist')) return false;
  // Other errors (permissions, etc.) — assume table exists but there's another issue
  return true;
}

/**
 * POST /api/login-history
 *
 * Records today's login for the authenticated user. Idempotent — the unique
 * constraint on (user_id, login_date) makes duplicate inserts a no-op.
 */
export const POST = withApiGuard(
  async (request, user) => {
    try {
      const supabase = getAdminClient();
      const todayStr = utcYmd(new Date());

      // Check if table exists first
      const exists = await tableExists(supabase);
      if (!exists) {
        console.error(
          '[login-history] user_login_history table does not exist. ' +
            'Run the migration in Supabase SQL Editor: CREATE TABLE IF NOT EXISTS public.user_login_history ...',
        );
        return NextResponse.json(
          {
            error: 'table_missing',
            hint: 'Run the user_login_history migration in Supabase SQL Editor.',
            fallback: { recorded: false, login_date: todayStr },
          },
          { status: 503 },
        );
      }

      const { error } = await supabase
        .from('user_login_history')
        .insert({ user_id: user.id, login_date: todayStr });

      if (error) {
        // Duplicate — already recorded today
        if (error.code === '23505') {
          return NextResponse.json({ recorded: true, login_date: todayStr, duplicate: true });
        }
        console.error('[login-history] insert failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ recorded: true, login_date: todayStr });
    } catch (err) {
      console.error('[login-history POST]', err);
      return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
    }
  },
  { requireAuth: true },
);

/**
 * GET /api/login-history?days=30
 *
 * Returns the user's login dates and computed streak.
 * If the table is missing, returns a fallback with just today marked (so the
 * component renders something rather than showing a dead 0/30).
 */
export const GET = withApiGuard(
  async (request, user) => {
    try {
      const supabase = getAdminClient();
      const { searchParams } = new URL(request.url);
      const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10), 1), 365);

      const today = new Date();
      const cutoff = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (days - 1)),
      );
      const cutoffStr = utcYmd(cutoff);

      const { data: rows, error } = await supabase
        .from('user_login_history')
        .select('login_date')
        .eq('user_id', user.id)
        .gte('login_date', cutoffStr)
        .order('login_date', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('[login-history GET] table missing — returning fallback with today only');
          // Return today as the only login so the component shows at least 1 active bar
          const todayStr = utcYmd(today);
          return NextResponse.json({
            dates: [todayStr],
            streakDays: 1,
            windowDays: days,
            _fallback: true,
            _hint: 'Run the user_login_history migration in Supabase SQL Editor.',
          });
        }
        console.error('[login-history GET] read failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const dates = (rows || []).map((r) =>
        typeof r.login_date === 'string' ? r.login_date : utcYmd(new Date(r.login_date)),
      );
      const dateSet = new Set(dates);
      const streakDays = computeStreakFromDates(dateSet);

      return NextResponse.json({ dates, streakDays, windowDays: days });
    } catch (err) {
      console.error('[login-history GET]', err);
      return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
