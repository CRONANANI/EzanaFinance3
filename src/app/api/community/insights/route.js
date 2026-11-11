/**
 * GET /api/community/insights?view=most-discussed|trending-topics|sentiment
 * Most Discussed adds each ticker's name and day change from batch quotes,
 * fetched here on the server (no key reaches the client), cached 60s.
 */
import { NextResponse } from 'next/server';
import { withSession, ttlCache, PRIVATE } from '@/lib/community/route-session';
import { FmpAPI } from '@/lib/services/fmp';
import {
  isCommunityDemoViewer,
  DEMO_MOST_DISCUSSED,
  demoTrendingTopics,
  demoSentiment,
} from '@/lib/community/demo-page';

export const dynamic = 'force-dynamic';
const cache = ttlCache(60_000);
const VIEWS = ['most-discussed', 'trending-topics', 'sentiment'];

async function quotesFor(symbols) {
  if (!symbols.length) return new Map();
  try {
    const list = await FmpAPI.getBatchQuote(symbols);
    return new Map(
      (list || []).map((q) => [
        String(q.symbol || '').toUpperCase(),
        {
          name: q.name || null,
          change_pct: Number.isFinite(Number(q.changePercentage ?? q.changesPercentage))
            ? Number(q.changePercentage ?? q.changesPercentage)
            : null,
        },
      ]),
    );
  } catch {
    return new Map(); /* rows still render, without name and change */
  }
}

export async function GET(request) {
  return withSession(request, 'insights', async ({ user, supabase }) => {
    const v = new URL(request.url).searchParams.get('view');
    const view = VIEWS.includes(v) ? v : 'most-discussed';

    /* Sample data for master admin and demo accounts. Answered before the
       shared cache is read or written, so it can never reach another member.
       Most Discussed still takes names and day changes from live quotes. */
    if (isCommunityDemoViewer(user)) {
      if (view === 'most-discussed') {
        const quotes = await quotesFor(DEMO_MOST_DISCUSSED.map((r) => r.ticker));
        return NextResponse.json(
          {
            view,
            rows: DEMO_MOST_DISCUSSED.map((r) => ({
              ...r,
              name: quotes.get(r.ticker)?.name || null,
              change_pct: quotes.get(r.ticker)?.change_pct ?? null,
            })),
          },
          { headers: PRIVATE },
        );
      }
      if (view === 'trending-topics') {
        const { data: topicRows } = await supabase.from('community_topics').select('slug, label');
        return NextResponse.json(
          { view, rows: demoTrendingTopics(topicRows || []) },
          { headers: PRIVATE },
        );
      }
      return NextResponse.json({ view, sentiment: demoSentiment() }, { headers: PRIVATE });
    }
    const hit = cache.get(view);
    if (hit) return NextResponse.json(hit, { headers: { 'Cache-Control': 'private, max-age=60' } });

    let body;
    if (view === 'most-discussed') {
      const { data, error } = await supabase.rpc('community_most_discussed', {
        p_days: 7,
        p_limit: 4,
      });
      if (error) throw new Error(error.message);
      const rows = (data || []).map((r) => ({
        ticker: String(r.ticker || '').toUpperCase(),
        posts: Number(r.post_count) || 0,
      }));
      const quotes = await quotesFor(rows.map((r) => r.ticker));
      body = {
        view,
        rows: rows.map((r) => ({
          ...r,
          name: quotes.get(r.ticker)?.name || null,
          change_pct: quotes.get(r.ticker)?.change_pct ?? null,
        })),
      };
    } else if (view === 'trending-topics') {
      const { data, error } = await supabase.rpc('community_trending_topics', {
        p_days: 7,
        p_limit: 4,
      });
      if (error) throw new Error(error.message);
      body = {
        view,
        rows: (data || []).map((r) => ({
          slug: r.topic_slug,
          label: r.topic_label,
          posts: Number(r.post_count) || 0,
          prior: Number(r.prior_count) || 0,
          delta_pct: r.delta_pct == null ? null : Number(r.delta_pct),
        })),
      };
    } else {
      const { data, error } = await supabase
        .from('community_pulse_snapshots')
        .select('computed_at, net_sentiment, posts_last_hour, hottest_ticker, hottest_mentions')
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      body = {
        view,
        sentiment: data
          ? {
              net: Math.max(-100, Math.min(100, Number(data.net_sentiment) || 0)),
              posts_last_hour: Number(data.posts_last_hour) || 0,
              hottest_ticker: data.hottest_ticker
                ? String(data.hottest_ticker).toUpperCase()
                : null,
              hottest_mentions: Number(data.hottest_mentions) || 0,
              at: data.computed_at,
            }
          : null,
      };
    }
    cache.set(view, body);
    return NextResponse.json(body, { headers: PRIVATE });
  });
}
