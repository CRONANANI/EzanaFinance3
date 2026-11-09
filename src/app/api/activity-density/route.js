import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const utcYmd = (d) => d.toISOString().slice(0, 10);

/**
 * GET /api/activity-density?days=371
 *
 * The signed-in user's activity for the home Morning Brief card: one entry
 * per UTC day they logged in or did something, `{ date, actions, login }`,
 * plus `end` (today, UTC). Days with neither are omitted; the card fills
 * them in as empty.
 *
 * Source: the public.user_activity_days RPC (migration
 * 20261111090000_user_activity_days.sql). Until that migration is applied
 * the route falls back to login days only, so the card still shows when the
 * user was here.
 */
export const GET = withApiGuard(
  async (request, user) => {
    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '371', 10) || 371, 7), 400);
    const now = new Date();
    const end = utcYmd(now);
    const since = utcYmd(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1))),
    );
    const headers = { 'Cache-Control': 'private, no-store' };

    try {
      const admin = getAdminClient();
      const { data, error } = await admin.rpc('user_activity_days', {
        p_user: user.id,
        p_since: since,
      });

      if (!error) {
        return NextResponse.json(
          {
            end,
            days: (data || []).map((r) => ({
              date: String(r.day).slice(0, 10),
              actions: Number(r.actions) || 0,
              login: Boolean(r.logged_in),
            })),
          },
          { headers },
        );
      }

      // PGRST202 / 42883: the RPC is not in the database yet. Fall back to
      // login days so the card still shows when the user was here.
      if (error.code !== 'PGRST202' && error.code !== '42883') throw error;
      const { data: logins, error: loginErr } = await admin
        .from('user_login_history')
        .select('login_date')
        .eq('user_id', user.id)
        .gte('login_date', since);
      if (loginErr) throw loginErr;
      return NextResponse.json(
        {
          end,
          days: (logins || []).map((r) => ({
            date: String(r.login_date).slice(0, 10),
            actions: 0,
            login: true,
          })),
          partial: true,
        },
        { headers },
      );
    } catch (err) {
      console.error('[activity-density GET]', err?.message || err);
      return NextResponse.json({ error: 'activity_unavailable' }, { status: 500, headers });
    }
  },
  { requireAuth: true },
);
