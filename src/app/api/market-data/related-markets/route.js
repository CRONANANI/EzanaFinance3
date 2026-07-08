import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';

/**
 * POST /api/market-data/related-markets  — semantic prediction-market matching.
 *
 * Body: { text, limit? }. Embeds `text` (Supabase gte-small edge fn, 384-dim),
 * then nearest-neighbour queries prediction_market_index via the match_markets
 * RPC (cosine, top-k). Returns markets mapped to the shape RelatedMarketsPanel
 * renders, each tagged with a `tier`:
 *   - 'confident' → similarity ≥ MATCH_THRESHOLD (Adjacent's 0.803) — show prominently
 *   - 'loose'     → LOOSE_THRESHOLD ≤ similarity < MATCH_THRESHOLD — "loosely related",
 *                   the UI should de-emphasize it and NEVER present it as confident
 * Querying at the looser floor widens coverage (more events surface a market)
 * without ever calling an unrelated market a confident match. Thresholds are
 * env-tunable. On embed/RPC failure returns an empty list with `_debug`. NO mock data.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Adjacent's production value (confident) + a de-emphasized "loosely related" floor.
const MATCH_THRESHOLD = Number(process.env.POLYMARKET_MATCH_THRESHOLD) || 0.803;
const LOOSE_THRESHOLD = Number(process.env.POLYMARKET_LOOSE_THRESHOLD) || 0.74;

/**
 * match_markets RPC row → the market shape RelatedMarketsPanel expects.
 * Returns null when the row has no verified event link so the pipeline drops
 * it — we never render a card that dead-ends on the Polymarket homepage or a
 * 404. `link` is written strictly (event slug only) by the index cron.
 */
function toPanelMarket(r) {
  const link = r.link || null;
  if (!link) return null;
  const similarity = r.similarity != null ? Number(r.similarity) : null;
  return {
    marketId: String(r.market_id ?? ''),
    marketTitle: r.question || 'Market',
    url: link,
    hasValidUrl: true,
    yesProbability: r.probability != null ? Number(r.probability) : null,
    volume: Number(r.volume ?? 0),
    volume24hr: 0,
    liquidity: Number(r.liquidity ?? 0),
    endDate: r.end_date || null,
    platform: r.platform || null,
    category: r.category || null,
    similarity,
    tier: similarity != null && similarity >= MATCH_THRESHOLD ? 'confident' : 'loose',
    icon: null,
  };
}

export const POST = withApiGuard(
  async (request) => {
    try {
      const body = await request.json().catch(() => ({}));
      const text = String(body?.text || '').trim();
      const limit = Math.min(20, Math.max(1, Number(body?.limit) || 8));
      // Per-request threshold overrides (bounded); default to the env/constant floor.
      const floor = Math.min(0.95, Math.max(0.5, Number(body?.threshold) || LOOSE_THRESHOLD));

      if (!text) return NextResponse.json({ markets: [], matched: 0, confident: 0 });
      if (!supaEmbedConfigured()) {
        return NextResponse.json({
          markets: [],
          matched: 0,
          confident: 0,
          _debug: 'supabase not configured',
        });
      }

      const queryEmbedding = await embedViaSupabase(text);
      if (!queryEmbedding) {
        return NextResponse.json({ markets: [], matched: 0, confident: 0, _debug: 'embed failed' });
      }

      const admin = getAdminClient();
      // Query at the looser floor so both tiers come back in one call; tag each.
      const { data, error } = await admin.rpc('match_markets', {
        query_embedding: queryEmbedding,
        match_threshold: floor,
        match_count: limit,
      });
      if (error) {
        return NextResponse.json({
          markets: [],
          matched: 0,
          confident: 0,
          _debug: `rpc: ${error.message}`,
        });
      }

      // Drop rows without a verified event link (toPanelMarket → null).
      const markets = (Array.isArray(data) ? data : []).map(toPanelMarket).filter(Boolean);
      const confident = markets.filter((m) => m.tier === 'confident').length;
      return NextResponse.json({
        markets,
        matched: markets.length,
        confident,
        thresholds: { confident: MATCH_THRESHOLD, loose: LOOSE_THRESHOLD },
      });
    } catch (err) {
      return NextResponse.json(
        { markets: [], matched: 0, confident: 0, _debug: err?.message || 'error' },
        { status: 500 },
      );
    }
  },
  { requireAuth: false },
);
