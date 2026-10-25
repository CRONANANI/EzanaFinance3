import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { fetchWithTimeout } from '@/lib/http/fetch-json';

export const dynamic = 'force-dynamic';

const POLYMARKET_GAMMA = 'https://gamma-api.polymarket.com';

const num = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** ilike pattern with the user's text escaped, so % and _ match literally. */
function likeTerm(s) {
  return `%${String(s)
    .slice(0, 80)
    .replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Kalshi markets from prediction_market_index (index-kalshi refreshes it every
 * two hours). The old live host is retired; reading the index also keeps
 * combo markets and stale rows out. Volume is contracts, never dollars.
 */
async function fetchKalshiMarkets(search, limit = 6) {
  if (!isServerSupabaseConfigured()) return [];
  try {
    const admin = getAdminClient();
    let q = admin
      .from('prediction_market_index')
      .select('market_id, question, probability, volume, volume_24h, end_date, link')
      .eq('platform', 'kalshi')
      .eq('status', 'active')
      .or(`end_date.is.null,end_date.gt."${new Date().toISOString()}"`)
      .order('volume', { ascending: false, nullsFirst: false })
      .limit(Math.min(Math.max(limit, 1), 50));
    if (search) q = q.ilike('question', likeTerm(search));
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []).map((m) => ({
      ticker: String(m.market_id).replace(/^kalshi:/, ''),
      title: m.question,
      question: m.question,
      probability: num(m.probability),
      volume: num(m.volume),
      volume_24h: num(m.volume_24h),
      volume_unit: 'contracts',
      close_time: m.end_date,
      link: m.link || null,
    }));
  } catch (err) {
    console.error('[polygon/markets] Kalshi index read error:', err.message);
    return [];
  }
}

async function fetchPolymarkets(limit = 6) {
  try {
    const res = await fetchWithTimeout(
      `${POLYMARKET_GAMMA}/markets?limit=${limit}&active=true&closed=false&order=volume&ascending=false`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[polygon/markets] Polymarket fetch error:', err.message);
    return [];
  }
}

export const GET = withApiGuard(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'polymarket';
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '6', 10);

    try {
      if (source === 'kalshi') {
        const markets = await fetchKalshiMarkets(search, limit);
        return NextResponse.json({ markets, source: 'kalshi' });
      }
      const markets = await fetchPolymarkets(limit);
      return NextResponse.json({ markets, source: 'polymarket' });
    } catch (err) {
      console.error('[polygon/markets]', err.message);
      return NextResponse.json({ markets: [], error: err.message });
    }
  },
  { requireAuth: false },
);
