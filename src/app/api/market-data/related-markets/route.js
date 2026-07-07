import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';

/**
 * POST /api/market-data/related-markets  — semantic prediction-market matching.
 *
 * Body: { text, limit? }. Embeds `text` (Supabase gte-small edge fn, 384-dim),
 * then nearest-neighbour queries prediction_market_index via the match_markets
 * RPC (cosine, threshold 0.803, top-k). Returns markets mapped to the shape
 * RelatedMarketsPanel renders. On embed/RPC failure returns an empty list with a
 * `_debug` reason (never swallowed silently). NO mock data.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Adjacent's production similarity value — exposed as a constant so it's tunable.
const MATCH_THRESHOLD = 0.803;

/** match_markets RPC row → the market shape RelatedMarketsPanel expects. */
function toPanelMarket(r) {
  const link = r.link || null;
  return {
    marketId: String(r.market_id ?? ''),
    marketTitle: r.question || 'Market',
    url: link || 'https://polymarket.com',
    hasValidUrl: !!link,
    yesProbability: r.probability != null ? Number(r.probability) : null,
    volume: Number(r.volume ?? 0),
    volume24hr: 0,
    liquidity: Number(r.liquidity ?? 0),
    endDate: r.end_date || null,
    platform: r.platform || null,
    category: r.category || null,
    similarity: r.similarity != null ? Number(r.similarity) : null,
    icon: null,
  };
}

export const POST = withApiGuard(
  async (request) => {
    try {
      const body = await request.json().catch(() => ({}));
      const text = String(body?.text || '').trim();
      const limit = Math.min(20, Math.max(1, Number(body?.limit) || 8));

      if (!text) return NextResponse.json({ markets: [], matched: 0 });
      if (!supaEmbedConfigured()) {
        return NextResponse.json({ markets: [], matched: 0, _debug: 'supabase not configured' });
      }

      const queryEmbedding = await embedViaSupabase(text);
      if (!queryEmbedding) {
        return NextResponse.json({ markets: [], matched: 0, _debug: 'embed failed' });
      }

      const admin = getAdminClient();
      const { data, error } = await admin.rpc('match_markets', {
        query_embedding: queryEmbedding,
        match_threshold: MATCH_THRESHOLD,
        match_count: limit,
      });
      if (error) {
        return NextResponse.json({ markets: [], matched: 0, _debug: `rpc: ${error.message}` });
      }

      const markets = (Array.isArray(data) ? data : []).map(toPanelMarket);
      return NextResponse.json({ markets, matched: markets.length });
    } catch (err) {
      return NextResponse.json(
        { markets: [], matched: 0, _debug: err?.message || 'error' },
        { status: 500 },
      );
    }
  },
  { requireAuth: false },
);
