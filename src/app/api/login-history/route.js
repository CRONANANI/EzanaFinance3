import { NextResponse } from 'next/server';
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
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getAdminClient();
    const todayStr = utcYmd(new Date());

    const { error } = await supabaseAdmin
      .from('user_login_history')
      .insert({ user_id: user.id, login_date: todayStr });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ recorded: true, login_date: todayStr, duplicate: true });
      }

      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('[login-history] table missing — attempting auto-create via exec_sql RPC');
        try {
          await supabaseAdmin.rpc('exec_sql', {
            sql: `
              CREATE TABLE IF NOT EXISTS public.user_login_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                login_date DATE NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT login_history_user_date_unique UNIQUE (user_id, login_date)
              );
              CREATE INDEX IF NOT EXISTS idx_login_history_user_date
                ON public.user_login_history (user_id, login_date DESC);
            `,
          });
        } catch (rpcErr) {
          console.warn('[login-history] exec_sql unavailable — apply migration 20260528120000_user_login_history.sql:', rpcErr?.message || rpcErr);
        }

        const retry = await supabaseAdmin
          .from('user_login_history')
          .insert({ user_id: user.id, login_date: todayStr });

        if (retry.error && retry.error.code !== '23505') {
          console.error('[login-history] insert after auto-create failed:', retry.error);
          return NextResponse.json(
            {
              error: retry.error.message,
              hint: 'Run supabase migration user_login_history on the database.',
            },
            { status: 500 },
          );
        }

        return NextResponse.json({ recorded: true, login_date: todayStr, created_table: true });
      }

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
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getAdminClient();
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
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ dates: [], streakDays: 0, windowDays: days });
      }
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
