/**
 * GET /api/community/contributors?days=30: Top Contributors (Nov 23, 2026).
 * community_top_contributors: an activity score, explained on the card:
 * 3 per post (at most 5 a day), 1 per reply (at most 10 a day), 1 per
 * distinct other member who liked or replied to your posts. Self-engagement
 * and hidden posts never count; members who opt out of leaderboards are left
 * out. Until the v3 migration is applied: { rows: [], unavailable: true }.
 */
import { NextResponse } from 'next/server';
import { withSession, ttlCache, PRIVATE } from '@/lib/community/route-session';
import { isMissingSchema } from '@/lib/community/v3';

export const dynamic = 'force-dynamic';
const cache = ttlCache(60_000);

export async function GET(request) {
  return withSession(request, 'contributors', async ({ supabase }) => {
    const sp = new URL(request.url).searchParams;
    const days = Math.min(365, Math.max(1, parseInt(sp.get('days') || '30', 10) || 30));
    const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') || '5', 10) || 5));
    const key = `${days}:${limit}`;
    let body = cache.get(key);
    if (!body) {
      const { data, error } = await supabase.rpc('community_top_contributors', {
        p_days: days,
        p_limit: limit,
      });
      if (error) {
        if (isMissingSchema(error))
          return NextResponse.json({ days, rows: [], unavailable: true }, { headers: PRIVATE });
        throw new Error(error.message);
      }
      body = {
        days,
        rows: (data || []).map((r, i) => ({
          rank: i + 1,
          user_id: r.user_id,
          username: r.username || null,
          name: r.display_name || 'Member',
          avatar_url: r.avatar_url || null,
          score: Number(r.score) || 0,
          posts: Number(r.posts) || 0,
          replies: Number(r.replies) || 0,
          engaged: Number(r.engaged_members) || 0,
        })),
      };
      cache.set(key, body);
    }
    return NextResponse.json(body, { headers: { 'Cache-Control': 'private, max-age=60' } });
  });
}
