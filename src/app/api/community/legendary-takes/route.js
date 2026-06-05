import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    try {
      const admin = getAdminClient();

      const { data: legendaryProfiles } = await admin
        .from('profiles')
        .select('id, full_name, username, user_settings')
        .filter('user_settings->>is_legendary', 'eq', 'true')
        .limit(20);

      if (!legendaryProfiles?.length) {
        return NextResponse.json({ takes: [] });
      }

      const legendaryIds = legendaryProfiles.map((p) => p.id);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: posts } = await admin
        .from('community_posts')
        .select('id, user_id, content, mentioned_ticker, created_at, likes_count')
        .in('user_id', legendaryIds)
        .gt('created_at', oneDayAgo)
        .is('parent_post_id', null)
        .order('created_at', { ascending: false })
        .limit(4);

      const profileMap = new Map(legendaryProfiles.map((p) => [p.id, p]));

      const takes = (posts || []).map((p) => {
        const u = profileMap.get(p.user_id);
        const topic = p.mentioned_ticker ? `$${p.mentioned_ticker}` : 'General';
        return {
          post_id: p.id,
          user: {
            id: p.user_id,
            name: (u?.full_name || u?.username || 'Member').trim(),
            username: u?.username || '',
          },
          take: p.content?.slice(0, 200) || '',
          topic,
          created_at: p.created_at,
          likes: p.likes_count || 0,
        };
      });

      return NextResponse.json({ takes });
    } catch (err) {
      console.error('[community/legendary-takes]', err);
      return NextResponse.json({ takes: [] });
    }
  },
  { requireAuth: false },
);
