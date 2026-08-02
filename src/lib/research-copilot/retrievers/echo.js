import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';
import { snippet, mergeBranches } from './shared';

/**
 * Echo articles retriever — hybrid (semantic + lexical), chunk-first with
 * parent-document synthesis context (RAG_SYSTEM.md §3 P1).
 *
 * Semantic: match_echo_chunks matches at chunk granularity, then hits are grouped
 * by article; each article's best-similarity chunk is the representative, and the
 * synthesized snippet is that chunk ± its neighbors (parent context, ≤1,200 chars).
 * Lexical: full-text over echo_article_chunks.tsv (join parent for the published
 * filter). Both fall back to the article-level path (match_echo_articles /
 * echo_articles.tsv) if the chunk path errors — e.g. before the migration runs.
 * mergeBranches dedupes on the article-level id so one article never appears twice.
 */
export const corpus = 'echo';
export const kind = 'semantic';
export const scope = 'public';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';
const PARENT_CONTEXT_CHARS = 1200;

// Log a fallback reason at most once per process so a missing migration doesn't
// spam logs on every query.
const warned = new Set();
function warnOnce(key, message, detail) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message, detail ? { detail } : undefined);
}

function echoUrl(slug, anchor) {
  const base = `/ezana-echo/${slug}`;
  return anchor ? `${base}#${anchor}` : base;
}

/** Article-level row (fallback path) → Result. */
function toResult(r) {
  return {
    corpus,
    id: String(r.id),
    title: r.title || r.article_title || 'Echo article',
    snippet: snippet(r.excerpt ?? r.article_excerpt),
    url: echoUrl(r.slug ?? r.article_slug),
    externalUrl: `${SITE_URL}${echoUrl(r.slug ?? r.article_slug)}`,
    similarity: r.similarity != null ? Number(r.similarity) : null,
    date: r.published_at || null,
    meta: { category: r.category ?? r.article_category ?? null },
  };
}

/**
 * Group chunk hits by article: representative = highest-similarity chunk; parent
 * context = representative ± its returned neighbors (adjacent chunk_index), joined
 * and capped. Returns one Result per article, best-similarity first.
 */
function groupChunksToResults(rows, limit) {
  const byArticle = new Map();
  for (const r of rows) {
    const key = String(r.article_id);
    if (!byArticle.has(key)) byArticle.set(key, []);
    byArticle.get(key).push(r);
  }
  const results = [];
  for (const chunks of byArticle.values()) {
    const rep = chunks.reduce((best, c) => (c.similarity > (best?.similarity ?? -1) ? c : best), null);
    // Parent context: the representative chunk plus any returned neighbors whose
    // chunk_index is adjacent, in reading order.
    const sorted = [...chunks].sort((a, b) => a.chunk_index - b.chunk_index);
    const repPos = sorted.findIndex((c) => c.chunk_index === rep.chunk_index);
    const window = sorted.slice(Math.max(0, repPos - 1), repPos + 2);
    const parentText = window.map((c) => c.content).join(' ');
    const anchor = rep.section_anchor || null;
    results.push({
      corpus,
      id: String(rep.article_id),
      title: rep.title || 'Echo article',
      snippet: snippet(parentText, PARENT_CONTEXT_CHARS),
      url: echoUrl(rep.slug, anchor),
      externalUrl: `${SITE_URL}${echoUrl(rep.slug, anchor)}`,
      similarity: rep.similarity != null ? Number(rep.similarity) : null,
      date: rep.published_at || null,
      meta: {
        category: rep.category ?? null,
        sectionAnchor: anchor,
        sectionTitle: rep.section_title || null,
        chunkIndex: rep.chunk_index ?? null,
      },
    });
  }
  results.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
  return results.slice(0, limit * 2);
}

/** Article-level semantic fallback (match_echo_articles). */
async function semanticArticlePass(admin, vec, limit, threshold) {
  const { data, error } = await admin.rpc('match_echo_articles', {
    query_embedding: vec,
    match_threshold: threshold,
    match_count: limit,
  });
  if (error) {
    console.error('[echo] article semantic RPC failed', { message: error.message });
    return [];
  }
  return Array.isArray(data) ? data.map(toResult) : [];
}

async function semanticPass(admin, query, ctx, limit, threshold) {
  if (!supaEmbedConfigured()) return [];
  const vec = ctx.queryEmbedding || (await embedViaSupabase(query));
  if (!vec) return [];
  // Chunk-level first (retrieve wide, then group to articles).
  const { data, error } = await admin.rpc('match_echo_chunks', {
    query_embedding: vec,
    match_threshold: threshold,
    match_count: limit * 2,
  });
  if (error) {
    warnOnce('chunk-semantic', '[echo] match_echo_chunks failed — article-level fallback', error.message);
    return semanticArticlePass(admin, vec, limit, threshold);
  }
  // Empty (not an error) means the chunk index isn't populated yet — e.g. between
  // deploy and the first chunk-indexing cron run. Fall back to the article-level
  // embedding so Echo semantic retrieval never silently goes dark in that window.
  if (!Array.isArray(data) || !data.length) {
    return semanticArticlePass(admin, vec, limit, threshold);
  }
  return groupChunksToResults(data, limit);
}

/** Article-level lexical fallback (echo_articles.tsv). */
async function lexicalArticlePass(admin, query, limit) {
  const { data, error } = await admin
    .from('echo_articles')
    .select('id, article_slug, article_title, article_excerpt, article_category, published_at')
    .eq('article_status', 'published')
    .textSearch('tsv', query, { type: 'websearch', config: 'english' })
    .limit(limit);
  if (error) {
    console.error('[echo] article lexical query failed', { message: error.message });
    return [];
  }
  return Array.isArray(data) ? data.map(toResult) : [];
}

function lexicalChunkToResult(row) {
  const a = row.echo_articles || {};
  const anchor = row.section_anchor || null;
  return {
    corpus,
    id: String(row.article_id),
    title: a.article_title || 'Echo article',
    snippet: snippet(a.article_excerpt),
    url: echoUrl(a.article_slug, anchor),
    externalUrl: `${SITE_URL}${echoUrl(a.article_slug, anchor)}`,
    similarity: null,
    date: a.published_at || null,
    meta: {
      category: a.article_category ?? null,
      sectionAnchor: anchor,
      sectionTitle: row.section_title || null,
      chunkIndex: row.chunk_index ?? null,
    },
  };
}

async function lexicalPass(admin, query, limit) {
  // Chunk-level full-text; join the parent for the published filter + metadata.
  const { data, error } = await admin
    .from('echo_article_chunks')
    .select(
      'article_id, chunk_index, section_anchor, section_title, echo_articles!inner(article_slug, article_title, article_excerpt, article_category, published_at, article_status)',
    )
    .eq('echo_articles.article_status', 'published')
    .textSearch('tsv', query, { type: 'websearch', config: 'english' })
    .limit(limit * 2);
  if (error) {
    warnOnce('chunk-lexical', '[echo] chunk lexical failed — article-level fallback', error.message);
    return lexicalArticlePass(admin, query, limit);
  }
  // Empty chunk-lexical while the chunk index is unpopulated → article-level tsv,
  // so exact-title/ticker Echo hits still land in the pre-index window.
  if (!Array.isArray(data) || !data.length) {
    return lexicalArticlePass(admin, query, limit);
  }
  // One row per article (first/best chunk).
  const seen = new Set();
  const out = [];
  for (const row of data) {
    const key = String(row.article_id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(lexicalChunkToResult(row));
  }
  return out.slice(0, limit);
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
