import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function sentimentFromContent(content) {
  const c = (content || '').toLowerCase();
  if (/\b(bear|short|sell|overvalued|crash|dump)\b/.test(c)) return -1;
  if (/\b(bull|long|buy|undervalued|moon|breakout)\b/.test(c)) return 1;
  return 0;
}

function matchesTicker(post, ticker) {
  const t = ticker.toUpperCase();
  if (post.mentioned_ticker?.toUpperCase() === t) return true;
  const embed = post.ticker_embed;
  if (Array.isArray(embed?.symbols)) {
    if (embed.symbols.some((s) => String(s?.symbol || '').toUpperCase() === t)) return true;
  }
  if (embed?.symbol?.toUpperCase?.() === t) return true;
  return (post.content || '').toUpperCase().includes(`$${t}`);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = (searchParams.get('ticker') || '').toUpperCase();
    if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });

    const admin = getAdminClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: posts } = await admin
      .from('community_posts')
      .select(
        'id, user_id, content, ticker_embed, mentioned_ticker, likes_count, comments_count, created_at',
      )
      .gt('created_at', sevenDaysAgo)
      .is('parent_post_id', null)
      .limit(200);

    const matched = (posts || []).filter((p) => matchesTicker(p, ticker));
    if (!matched.length) {
      return NextResponse.json({ ticker, bull: null, bear: null });
    }

    const ids = matched.map((p) => p.id);
    const { data: convictions } = await admin
      .from('post_convictions')
      .select('post_id, conviction_pct')
      .in('post_id', ids);

    const convMap = {};
    for (const c of convictions || []) {
      convMap[c.post_id] = convMap[c.post_id] || [];
      convMap[c.post_id].push(Number(c.conviction_pct));
    }

    const enriched = matched.map((p) => {
      const arr = convMap[p.id] || [];
      const avgConv = arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 50;
      return { ...p, avg_conviction: avgConv, sentiment: sentimentFromContent(p.content) };
    });

    const bulls = enriched
      .filter((p) => p.sentiment > 0)
      .sort((a, b) => b.avg_conviction - a.avg_conviction);
    const bears = enriched
      .filter((p) => p.sentiment < 0)
      .sort((a, b) => b.avg_conviction - a.avg_conviction);

    const userIds = [bulls[0]?.user_id, bears[0]?.user_id].filter(Boolean);
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name, username, user_settings')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    function shape(post) {
      if (!post) return null;
      const profile = profileMap.get(post.user_id);
      const settings = profile?.user_settings || {};
      return {
        post_id: post.id,
        user: {
          id: post.user_id,
          name: (profile?.full_name || profile?.username || 'Member').trim(),
          username: profile?.username || '',
          skill_tier: settings.skill_tier || settings.skill_rating || 'Novice',
          is_legendary: settings.is_legendary === true,
          is_verified: settings.is_verified === true,
        },
        title: post.content?.split('\n')[0]?.slice(0, 80) || '',
        excerpt: post.content?.slice(0, 200) || '',
        conviction: post.avg_conviction,
        likes: post.likes_count || 0,
      };
    }

    return NextResponse.json({
      ticker,
      bull: shape(bulls[0]),
      bear: shape(bears[0]),
    });
  } catch (err) {
    console.error('[community/bull-bear]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
