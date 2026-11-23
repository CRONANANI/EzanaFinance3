/**
 * GET /api/community/overview: the Community Overview card (Nov 23, 2026).
 *   members      active member accounts (community_page_stats)
 *   builds       Research Builds shared to the Community (posts of a build
 *                kind; private saved research never counts)
 *   discussions  top-level posts that are not hidden (community_page_stats)
 * Real counts only, cached 60s per instance.
 */
import { NextResponse } from 'next/server';
import { withSession, ttlCache, PRIVATE } from '@/lib/community/route-session';
import { LEADERBOARD_PERIOD } from '@/lib/community/redesign';
import { BUILD_KINDS } from '@/lib/community/v3';

export const dynamic = 'force-dynamic';
const cache = ttlCache(60_000);

export async function GET(request) {
  return withSession(request, 'overview', async ({ supabase }) => {
    let body = cache.get('overview');
    if (!body) {
      const [stats, builds] = await Promise.all([
        supabase.rpc('community_page_stats', { p_period: LEADERBOARD_PERIOD }),
        supabase
          .from('community_posts')
          .select('id', { count: 'exact', head: true })
          .is('parent_post_id', null)
          .is('moderation_hidden_at', null)
          .in('post_type', BUILD_KINDS),
      ]);
      if (stats.error) throw new Error(stats.error.message);
      const row = (Array.isArray(stats.data) ? stats.data[0] : stats.data) || {};
      body = {
        members: Number(row.total_members) || 0,
        builds: builds.error ? 0 : Number(builds.count) || 0,
        discussions: Number(row.discussions) || 0,
      };
      cache.set('overview', body);
    }
    return NextResponse.json(body, { headers: { 'Cache-Control': 'private, max-age=60' } });
  });
}
