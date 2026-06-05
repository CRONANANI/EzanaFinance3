import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, getCurrentUser } from '@/lib/supabase';
import { isDemoViewer, DEMO_CONVICTION_MAP } from '@/lib/community/demo-data';

export const dynamic = 'force-dynamic';

function sentimentFromContent(content) {
  const c = (content || '').toLowerCase();
  if (/\b(bear|short|sell|overvalued|crash|dump)\b/.test(c)) return -1;
  if (/\b(bull|long|buy|undervalued|moon|breakout)\b/.test(c)) return 1;
  return 0;
}

function primarySymbol(post) {
  const embed = post.ticker_embed;
  if (embed?.symbols?.[0]?.symbol) return String(embed.symbols[0].symbol).toUpperCase();
  if (embed?.symbol) return String(embed.symbol).toUpperCase();
  if (post.mentioned_ticker) return String(post.mentioned_ticker).toUpperCase();
  return null;
}

export const GET = withApiGuard(
  async (request, user) => {
    try {
      const user = await getCurrentUser(request);
      if (isDemoViewer(user)) return NextResponse.json(DEMO_CONVICTION_MAP);

      const admin = getAdminClient();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: posts } = await admin
        .from('community_posts')
        .select('id, content, mentioned_ticker, ticker_embed')
        .gt('created_at', oneDayAgo)
        .is('parent_post_id', null)
        .limit(1000);

      const tickerGroups = {};
      for (const p of posts || []) {
        const sym = primarySymbol(p);
        if (!sym) continue;
        tickerGroups[sym] = tickerGroups[sym] || { posts: [], bull_count: 0, bear_count: 0 };
        tickerGroups[sym].posts.push(p.id);
        const sent = sentimentFromContent(p.content);
        if (sent > 0) tickerGroups[sym].bull_count += 1;
        else if (sent < 0) tickerGroups[sym].bear_count += 1;
      }

      const allPostIds = Object.values(tickerGroups).flatMap((g) => g.posts);
      const postConvictionMap = {};

      if (allPostIds.length) {
        const { data: convictions } = await admin
          .from('post_convictions')
          .select('post_id, conviction_pct')
          .in('post_id', allPostIds);

        for (const c of convictions || []) {
          postConvictionMap[c.post_id] = postConvictionMap[c.post_id] || [];
          postConvictionMap[c.post_id].push(Number(c.conviction_pct));
        }
      }

      const tickers = Object.entries(tickerGroups)
        .map(([symbol, group]) => {
          const allConvictions = group.posts.flatMap((id) => postConvictionMap[id] || []);
          const avgConviction =
            allConvictions.length > 0
              ? Math.round(allConvictions.reduce((a, b) => a + b, 0) / allConvictions.length)
              : 50;
          const totalSentiment = group.bull_count + group.bear_count;
          const bullPct =
            totalSentiment > 0 ? Math.round((group.bull_count / totalSentiment) * 100) : 50;

          return {
            symbol,
            bull_pct: bullPct,
            bear_pct: 100 - bullPct,
            avg_conviction: avgConviction,
            post_count: group.posts.length,
          };
        })
        .sort((a, b) => b.post_count - a.post_count);

      return NextResponse.json({ tickers: tickers.slice(0, 6) });
    } catch (err) {
      console.error('[community/conviction-map]', err);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
