/** GET /api/community/stats: the four stat tiles (community_page_stats), cached 60s per user. */
import { NextResponse } from 'next/server';
import { withSession, ttlCache, PRIVATE } from '@/lib/community/route-session';
import { LEADERBOARD_PERIOD } from '@/lib/community/redesign';
import { isCommunityDemoViewer, DEMO_STATS } from '@/lib/community/demo-page';

export const dynamic = 'force-dynamic';
const cache = ttlCache(60_000);

export async function GET(request) {
  return withSession(request, 'stats', async ({ user, supabase }) => {
    if (isCommunityDemoViewer(user)) return NextResponse.json(DEMO_STATS, { headers: PRIVATE });
    let stats = cache.get(user.id);
    if (!stats) {
      const { data, error } = await supabase.rpc('community_page_stats', {
        p_period: LEADERBOARD_PERIOD,
      });
      if (error) throw new Error(error.message);
      const row = (Array.isArray(data) ? data[0] : data) || {};
      stats = {
        total_members: Number(row.total_members) || 0,
        active_this_month: Number(row.active_this_month) || 0,
        discussions: Number(row.discussions) || 0,
        my_rank: row.my_rank == null ? null : Number(row.my_rank),
      };
      cache.set(user.id, stats);
    }
    return NextResponse.json(stats, { headers: { 'Cache-Control': 'private, max-age=60' } });
  });
}
