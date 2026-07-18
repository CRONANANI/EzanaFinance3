import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';
import { snippet, mergeBranches } from './shared';

/**
 * Echo articles retriever — hybrid (semantic + lexical). Runs BOTH a vector pass
 * (match_echo_articles, gte-small 384-dim cosine) and a full-text pass
 * (.textSearch on the tsv column) over published articles, then merges/dedupes.
 * The lexical branch catches exact titles/tickers the embedding misses. Public.
 */
export const corpus = 'echo';
export const kind = 'semantic';
export const scope = 'public';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';

function toResult(r) {
  return {
    corpus,
    id: String(r.id),
    title: r.title || r.article_title || 'Echo article',
    snippet: snippet(r.excerpt ?? r.article_excerpt),
    url: `/ezana-echo/${r.slug ?? r.article_slug}`,
    externalUrl: `${SITE_URL}/ezana-echo/${r.slug ?? r.article_slug}`,
    similarity: r.similarity != null ? Number(r.similarity) : null,
    date: r.published_at || null,
    meta: { category: r.category ?? r.article_category ?? null },
  };
}

async function semanticPass(admin, query, ctx, limit, threshold) {
  if (!supaEmbedConfigured()) return [];
  const vec = ctx.queryEmbedding || (await embedViaSupabase(query));
  if (!vec) return [];
  const { data, error } = await admin.rpc('match_echo_articles', {
    query_embedding: vec,
    match_threshold: threshold,
    match_count: limit,
  });
  if (error || !Array.isArray(data)) return [];
  return data.map(toResult);
}

async function lexicalPass(admin, query, limit) {
  const { data, error } = await admin
    .from('echo_articles')
    .select('id, article_slug, article_title, article_excerpt, article_category, published_at')
    .eq('article_status', 'published')
    .textSearch('tsv', query, { type: 'websearch', config: 'english' })
    .limit(limit);
  if (error || !Array.isArray(data)) return [];
  return data.map(toResult);
}

export async function retrieve(query, ctx = {}, opts = {}) {
  const { limit = 6, threshold = 0.3 } = opts;
  const admin = ctx.admin || getAdminClient();
  const [semantic, lexical] = await Promise.all([
    semanticPass(admin, query, ctx, limit, threshold),
    lexicalPass(admin, query, limit),
  ]);
  return mergeBranches(semantic, lexical).slice(0, limit * 2);
}
