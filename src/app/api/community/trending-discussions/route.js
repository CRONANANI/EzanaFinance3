import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/community/trending-discussions
 * Top posts by comments_count in the last 7 days (stand-in for discussions table).
 */
export async function GET() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('community_posts')
      .select('id, content, comments_count, user_id, updated_at')
      .gte('updated_at', sevenDaysAgo)
      .is('parent_post_id', null)
      .order('comments_count', { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) {
      return NextResponse.json({ discussions: [] });
    }

    const uids = [...new Set(data.map((d) => d.user_id).filter(Boolean))];
    const { data: profs } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .in('id', uids);
    const pmap = Object.fromEntries((profs || []).map((p) => [p.id, p.username]));

    const discussions = data.map((d) => {
      const title = String(d.content || '').split('\n')[0].trim().slice(0, 120) || 'Discussion';
      const un = pmap[d.user_id];
      return {
        title,
        author: un ? `@${un}` : '@member',
        comments: Number(d.comments_count) || 0,
        tone: 'emerald',
      };
    });

    return NextResponse.json({ discussions });
  } catch (e) {
    console.error('[community/trending-discussions]', e);
    return NextResponse.json({ discussions: [] });
  }
}
