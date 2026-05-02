import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TAG_RE = /#([A-Za-z][A-Za-z0-9_]*)/g;

/**
 * GET /api/community/trending-topics
 * Parses hashtags from community_posts.content (last 7 days), top 15.
 */
export async function GET() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data, error } = await supabaseAdmin
      .from('community_posts')
      .select('content, mentioned_ticker')
      .gte('created_at', sevenDaysAgo)
      .is('parent_post_id', null)
      .limit(2000);

    if (error || !data || data.length === 0) {
      return NextResponse.json({ topics: [] });
    }

    const counts = new Map();
    const categoryByTag = new Map();

    for (const row of data) {
      const text = String(row.content || '');
      let m;
      TAG_RE.lastIndex = 0;
      while ((m = TAG_RE.exec(text)) !== null) {
        const clean = m[1]?.trim();
        if (!clean) continue;
        counts.set(clean, (counts.get(clean) || 0) + 1);
        if (!categoryByTag.has(clean) && row.mentioned_ticker) {
          categoryByTag.set(clean, 'Markets');
        }
      }
    }

    const topics = [...counts.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([tag, count]) => ({
        tag,
        posts: count >= 1000 ? `${(count / 1000).toFixed(1)}K` : String(count),
        category: categoryByTag.get(tag) || 'General',
        trend: 'up',
      }));

    return NextResponse.json({ topics });
  } catch (e) {
    console.error('[community/trending-topics]', e);
    return NextResponse.json({ topics: [] });
  }
}
