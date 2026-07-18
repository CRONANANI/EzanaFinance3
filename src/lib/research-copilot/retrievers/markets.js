import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';

/**
 * Prediction-markets retriever — semantic. Nearest-neighbour over
 * prediction_market_index via match_markets (gte-small 384-dim cosine).
 * Public corpus. Queries at a looser floor so more markets surface; the
 * orchestrator ranks by similarity.
 */
export const corpus = 'markets';
export const kind = 'semantic';
export const scope = 'public';

const LOOSE_THRESHOLD = Number(process.env.POLYMARKET_LOOSE_THRESHOLD) || 0.74;

export async function retrieve(query, ctx = {}, opts = {}) {
  const { limit = 6, threshold = LOOSE_THRESHOLD } = opts;
  if (!supaEmbedConfigured()) return [];
  const vec = ctx.queryEmbedding || (await embedViaSupabase(query));
  if (!vec) return [];

  const admin = ctx.admin || getAdminClient();
  const { data, error } = await admin.rpc('match_markets', {
    query_embedding: vec,
    match_threshold: threshold,
    match_count: limit,
  });
  if (error || !Array.isArray(data)) return [];

  return data.map((r) => {
    const prob = r.probability != null ? Number(r.probability) : null;
    const probPct = prob != null ? `${Math.round(prob * 100)}% YES` : null;
    return {
      corpus,
      id: String(r.market_id ?? ''),
      title: r.question || 'Prediction market',
      snippet: [r.platform, probPct, r.category].filter(Boolean).join(' · '),
      url: r.link || null,
      similarity: r.similarity != null ? Number(r.similarity) : null,
      date: r.end_date || null,
      meta: {
        platform: r.platform || null,
        probability: prob,
        volume: r.volume != null ? Number(r.volume) : null,
        category: r.category || null,
      },
    };
  });
}
