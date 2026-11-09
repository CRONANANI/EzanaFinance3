/**
 * GET /api/community/leaderboard/top: the Community page leaderboard card
 * (community_leaderboard for the current period), top three plus the
 * caller's own row when ranked. Lives beside the older /leaderboard route,
 * which other surfaces still read.
 */
import { NextResponse } from 'next/server';
import { withSession, PRIVATE } from '@/lib/community/route-session';
import { LEADERBOARD_PERIOD, displayNameOf } from '@/lib/community/redesign';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return withSession(request, 'leaderboard', async ({ supabase }) => {
    const { data, error } = await supabase.rpc('community_leaderboard', {
      p_period: LEADERBOARD_PERIOD,
      p_limit: 3,
    });
    if (error) throw new Error(error.message);
    const rows = (data || []).map((r) => ({
      rank: Number(r.rank),
      user_id: r.user_id,
      name: displayNameOf(r),
      username: r.username || null,
      avatar_url: r.avatar_url || null,
      return_pct: r.return_pct == null ? null : Number(r.return_pct),
      is_me: Boolean(r.is_me),
    }));
    /* The RPC returns the top three plus the caller's own row when ranked lower. */
    const top = rows.filter((r) => r.rank <= 3).slice(0, 3);
    const me = rows.find((r) => r.is_me && !top.some((t) => t.user_id === r.user_id)) || null;
    const meInTop = top.some((r) => r.is_me);
    return NextResponse.json(
      { period: LEADERBOARD_PERIOD, top, me, ranked: meInTop || Boolean(me) },
      { headers: PRIVATE },
    );
  });
}
