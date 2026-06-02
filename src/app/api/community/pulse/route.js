import { NextResponse } from 'next/server';
import { getAdminClient, getCurrentUser } from '@/lib/supabase';
import { isDemoViewer, DEMO_PULSE } from '@/lib/community/demo-data';

export const dynamic = 'force-dynamic';

const TICKER_TO_SECTOR = {
  AAPL: 'Tech',
  MSFT: 'Tech',
  GOOGL: 'Tech',
  META: 'Tech',
  NVDA: 'Tech',
  AMZN: 'Tech',
  TSLA: 'Tech',
  TSM: 'Tech',
  XOM: 'Energy',
  CVX: 'Energy',
  SLB: 'Energy',
  COP: 'Energy',
  OXY: 'Energy',
  JPM: 'Financials',
  BAC: 'Financials',
  GS: 'Financials',
  WFC: 'Financials',
  MS: 'Financials',
  UNH: 'Healthcare',
  JNJ: 'Healthcare',
  PFE: 'Healthcare',
  LLY: 'Healthcare',
  ABBV: 'Healthcare',
  PG: 'Consumer',
  KO: 'Consumer',
  WMT: 'Consumer',
  PEP: 'Consumer',
  COST: 'Consumer',
};

function sentimentFromContent(content) {
  const c = (content || '').toLowerCase();
  if (/\b(bear|short|sell|overvalued|crash|dump|puts?)\b/.test(c)) return -1;
  if (/\b(bull|long|buy|undervalued|moon|breakout|calls?)\b/.test(c)) return 1;
  return 0;
}

function extractTickers(content, mentioned, embed) {
  const set = new Set();
  if (mentioned) set.add(String(mentioned).toUpperCase());
  const symbols = embed?.symbols;
  if (Array.isArray(symbols)) {
    for (const s of symbols) {
      const sym = (s?.symbol || s)?.toString?.()?.toUpperCase?.();
      if (sym) set.add(sym);
    }
  }
  const re = /\$([A-Za-z]{1,5})\b/g;
  let m;
  while ((m = re.exec(content || ''))) {
    set.add(m[1].toUpperCase());
  }
  return [...set];
}

function computePulseFromPosts(postsArr) {
  const sectorBuckets = {};
  const tickerCounts = {};
  const activeUsers = new Set();
  let bullSum = 0;
  let bearSum = 0;
  let sentimentTagged = 0;
  let discussions = 0;

  for (const p of postsArr) {
    activeUsers.add(p.user_id);
    if (/#discussion\b/i.test(p.content || '')) discussions += 1;

    const sent = sentimentFromContent(p.content);
    if (sent !== 0) {
      sentimentTagged += 1;
      if (sent > 0) bullSum += 30;
      else bearSum += 30;
    }

    for (const sym of extractTickers(p.content, p.mentioned_ticker, p.ticker_embed)) {
      tickerCounts[sym] = (tickerCounts[sym] || 0) + 1;
      const sector = TICKER_TO_SECTOR[sym];
      if (sector) {
        sectorBuckets[sector] = sectorBuckets[sector] || {
          name: sector,
          sentiment_sum: 0,
          mentions: 0,
        };
        sectorBuckets[sector].mentions += 1;
        if (sent !== 0) sectorBuckets[sector].sentiment_sum += sent > 0 ? 25 : -25;
      }
    }
  }

  const netSentiment = sentimentTagged > 0 ? Math.round((bullSum - bearSum) / sentimentTagged) : 0;

  const sectors = Object.values(sectorBuckets)
    .map((s) => ({
      name: s.name,
      sentiment: s.mentions > 0 ? Math.round(s.sentiment_sum / s.mentions) : 0,
      mentions: s.mentions,
    }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 5);

  const hotEntry = Object.entries(tickerCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    net_sentiment: Math.max(-100, Math.min(100, netSentiment)),
    posts_last_hour: postsArr.length,
    active_investors: activeUsers.size,
    discussions_started: discussions,
    hottest_ticker: hotEntry?.[0] || null,
    hottest_mentions: hotEntry?.[1] || 0,
    sectors,
  };
}

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    if (isDemoViewer(user)) return NextResponse.json(DEMO_PULSE);

    const admin = getAdminClient();

    const { data: snap } = await admin
      .from('community_pulse_snapshots')
      .select('*')
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const stale = !snap || Date.now() - new Date(snap.computed_at).getTime() > 10 * 60 * 1000;

    if (!stale && snap) {
      return NextResponse.json({
        net_sentiment: snap.net_sentiment,
        posts_last_hour: snap.posts_last_hour,
        active_investors: snap.active_investors,
        discussions_started: snap.discussions_started,
        hottest_ticker: snap.hottest_ticker,
        hottest_mentions: snap.hottest_mentions,
        sectors: snap.sectors || [],
      });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: posts } = await admin
      .from('community_posts')
      .select('id, user_id, content, mentioned_ticker, ticker_embed, created_at')
      .gt('created_at', oneHourAgo)
      .is('parent_post_id', null)
      .limit(2000);

    const fresh = computePulseFromPosts(posts || []);

    admin
      .from('community_pulse_snapshots')
      .insert(fresh)
      .then(() => {})
      .catch(() => {});

    return NextResponse.json(fresh);
  } catch (err) {
    console.error('[community/pulse]', err);
    return NextResponse.json({ error: 'Failed to compute pulse' }, { status: 500 });
  }
}
