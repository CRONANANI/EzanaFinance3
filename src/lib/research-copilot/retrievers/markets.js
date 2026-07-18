import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';
import { mergeBranches } from './shared';

/**
 * Prediction-markets retriever — hybrid (semantic + lexical). Runs BOTH a vector
 * pass (match_markets, gte-small 384-dim cosine) and a full-text pass
 * (.textSearch on prediction_market_index.tsv) so exact market titles/tickers
 * hit lexically, then merges/dedupes. Public corpus.
 */
export const corpus = 'markets';
export const kind = 'semantic';
export const scope = 'public';

const LOOSE_THRESHOLD = Number(process.env.POLYMARKET_LOOSE_THRESHOLD) || 0.74;

function toResult(r) {
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
}

async function semanticPass(admin, query, ctx, limit, threshold) {
  if (!supaEmbedConfigured()) return [];
  const vec = ctx.queryEmbedding || (await embedViaSupabase(query));
  if (!vec) return [];
  const { data, error } = await admin.rpc('match_markets', {
    query_embedding: vec,
    match_threshold: threshold,
    match_count: limit,
  });
  if (error || !Array.isArray(data)) return [];
  return data.map(toResult);
}

async function lexicalPass(admin, query, limit) {
  const { data, error } = await admin
    .from('prediction_market_index')
    .select('market_id, question, platform, probability, volume, end_date, link, category')
    .in('status', ['active', 'true'])
    .textSearch('tsv', query, { type: 'websearch', config: 'english' })
    .limit(limit);
  if (error || !Array.isArray(data)) return [];
  return data.map(toResult);
}

export async function retrieve(query, ctx = {}, opts = {}) {
  const { limit = 6, threshold = LOOSE_THRESHOLD } = opts;
  const admin = ctx.admin || getAdminClient();
  const [semantic, lexical] = await Promise.all([
    semanticPass(admin, query, ctx, limit, threshold),
    lexicalPass(admin, query, limit),
  ]);
  return mergeBranches(semantic, lexical).slice(0, limit * 2);
}
