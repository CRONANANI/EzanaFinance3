/**
 * GET /api/community/leaderboard/top: the Community page leaderboard card
 * (community_leaderboard for the current period), top five plus the
 * caller's own row when ranked. Lives beside the older /leaderboard route,
 * which other surfaces still read.
 */
import { NextResponse } from 'next/server';
import { withSession, PRIVATE } from '@/lib/community/route-session';
import { LEADERBOARD_PERIOD, displayNameOf } from '@/lib/community/redesign';
import { isCommunityDemoViewer, demoLeaderboard } from '@/lib/community/demo-page';

export const dynamic = 'force-dynamic';

/* Nov 15 2026: the card lists the top five (it was three). */
const TOP = 5;

export async function GET(request) {
  return withSession(request, 'leaderboard', async ({ user, supabase }) => {
    if (isCommunityDemoViewer(user)) {
      return NextResponse.json(demoLeaderboard(user, LEADERBOARD_PERIOD), { headers: PRIVATE });
    }
    const { data, error } = await supabase.rpc('community_leaderboard', {
      p_period: LEADERBOARD_PERIOD,
      p_limit: TOP,
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
    /* The RPC returns the top rows plus the caller's own row when ranked lower. */
    const top = rows.filter((r) => r.rank <= TOP).slice(0, TOP);
    const me = rows.find((r) => r.is_me && !top.some((t) => t.user_id === r.user_id)) || null;
    const meInTop = top.some((r) => r.is_me);
    return NextResponse.json(
      { period: LEADERBOARD_PERIOD, top, me, ranked: meInTop || Boolean(me) },
      { headers: PRIVATE },
    );
  });
}
