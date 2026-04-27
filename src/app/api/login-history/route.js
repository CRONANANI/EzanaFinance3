import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';

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
 * POST /api/login-history
 *
 * Records that the user is "active" today. Idempotent: the unique constraint
 * on (user_id, login_date) makes duplicate inserts safe (we catch 23505).
 *
 * GET /api/login-history?days=30
 *
 * Returns the user's login history for the last N days (default 30).
 * Response: { dates: ['2026-04-27', ...], streakDays: 14, windowDays: 30 }
 *
 * Streak: consecutive UTC days with a login, counting backward from today;
 * if today has no row yet, streak starts from the most recent prior day.
 */
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todayStr = utcYmd(new Date());

    const { error } = await supabaseAdmin
      .from('user_login_history')
      .insert({ user_id: user.id, login_date: todayStr });

    if (error && error.code !== '23505') {
      console.error('[login-history] insert failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ recorded: true, login_date: todayStr });
  } catch (err) {
    console.error('[login-history POST] unexpected error:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10), 1), 365);

    const today = new Date();
    const cutoff = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - (days - 1),
      ),
    );
    const cutoffStr = utcYmd(cutoff);

    const { data: rows, error } = await supabaseAdmin
      .from('user_login_history')
      .select('login_date')
      .eq('user_id', user.id)
      .gte('login_date', cutoffStr)
      .order('login_date', { ascending: false });

    if (error) {
      console.error('[login-history GET] read failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const dates = (rows || []).map((r) =>
      typeof r.login_date === 'string' ? r.login_date : utcYmd(new Date(r.login_date)),
    );
    const dateSet = new Set(dates);
    const streakDays = computeStreakFromDates(dateSet);

    return NextResponse.json({
      dates,
      streakDays,
      windowDays: days,
    });
  } catch (err) {
    console.error('[login-history GET] unexpected error:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
