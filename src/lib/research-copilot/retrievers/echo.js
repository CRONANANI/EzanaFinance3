import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';
import { snippet } from './shared';

/**
 * Echo articles retriever — semantic. Nearest-neighbour over published Echo
 * articles via match_echo_articles (gte-small 384-dim cosine). Public corpus.
 */
export const corpus = 'echo';
export const kind = 'semantic';
export const scope = 'public';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';

export async function retrieve(query, ctx = {}, opts = {}) {
  const { limit = 6, threshold = 0.3 } = opts;
  if (!supaEmbedConfigured()) return [];
  const vec = ctx.queryEmbedding || (await embedViaSupabase(query));
  if (!vec) return [];

  const admin = ctx.admin || getAdminClient();
  const { data, error } = await admin.rpc('match_echo_articles', {
    query_embedding: vec,
    match_threshold: threshold,
    match_count: limit,
  });
  if (error || !Array.isArray(data)) return [];

  return data.map((r) => ({
    corpus,
    id: String(r.id),
    title: r.title || 'Echo article',
    snippet: snippet(r.excerpt),
    // Echo articles are public at /ezana-echo/{slug} (relative link for in-app nav).
    url: `/ezana-echo/${r.slug}`,
    externalUrl: `${SITE_URL}/ezana-echo/${r.slug}`,
    similarity: r.similarity != null ? Number(r.similarity) : null,
    date: r.published_at || null,
    meta: { category: r.category || null },
  }));
}
