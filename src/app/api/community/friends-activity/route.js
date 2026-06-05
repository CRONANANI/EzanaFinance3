import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getCurrentUser, getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const admin = getAdminClient();

/**
 * GET /api/community/friends-activity
 * Recent posts from users the current user follows.
 */
export const GET = withApiGuard(
  async (request, user) => {
    try {
      const { data: follows, error: followsErr } = await admin
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followsErr || !follows || follows.length === 0) {
        return NextResponse.json({ activity: [] });
      }

      const followedIds = [...new Set(follows.map((f) => f.following_id))];

      const { data: posts } = await admin
        .from('community_posts')
        .select('id, user_id, content, created_at')
        .in('user_id', followedIds)
        .is('parent_post_id', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!posts || posts.length === 0) {
        return NextResponse.json({ activity: [] });
      }

      const uids = [...new Set(posts.map((p) => p.user_id))];
      const { data: profs } = await admin
        .from('profiles')
        .select('id, full_name, username')
        .in('id', uids);
      const pmap = Object.fromEntries((profs || []).map((p) => [p.id, p]));

      const activity = posts.map((p) => {
        const pr = pmap[p.user_id];
        return {
          name: pr?.full_name || pr?.username || 'User',
          username: pr?.username || '',
          action: 'Created a new post',
          ret: null,
          direction: null,
          time: relativeTime(new Date(p.created_at)),
        };
      });

      return NextResponse.json({ activity });
    } catch (e) {
      console.error('[community/friends-activity]', e);
      return NextResponse.json({ activity: [] });
    }
  },
  { requireAuth: true },
);

function relativeTime(date) {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}
