/**
 * Help-center Q&A retrieval (Nov 2026), shared by /api/help-center/ask and its tests.
 *
 * Retrieval is hybrid and layered so there are always candidate articles:
 *   1. semantic: match_help_articles over help_center_articles (gte-small);
 *   2. keyword: tsv websearch + title ILIKE over the same table;
 *   3. lexical fallback: the in-repo index (src/lib/help-center-search.js).
 * A partner question that no layer matches is answered from the user help center in
 * the same request (answeredFrom: 'user'), so the page never makes a second call.
 * Pure apart from the injected clients: pass { admin, searchHelp } to test.
 */
import { supaEmbedConfigured } from '@/lib/embeddings-gte';
import { embedViaSupabaseCached } from '@/lib/rag/embed-cached';
import { logZeroResult } from '@/lib/rag/zero-results';

export const MAX_SOURCES = 6;
export const GROUNDING = 3;
const SEMANTIC_THRESHOLD = Number(process.env.HELP_CENTER_MATCH_THRESHOLD) || 0.3;

/** Shared answer cache key: help:ask:v1:<audience|all>:<normalized query>. */
export function helpCacheKey(audience, query) {
  return `help:ask:v1:${audience || 'all'}:${String(query || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()}`;
}

/** Only grounded answers with at least one source are cached. */
export const shouldCacheHelp = (payload) =>
  Boolean(payload?.answer && payload?.grounded && !payload?.degraded && payload?.sources?.length);

/** Merge rows from every retrieval layer, dedupe by (audience, slug), cap. */
export function mergeSources(...layers) {
  const byKey = new Map();
  for (const rows of layers) {
    for (const r of rows || []) {
      const key = `${r.audience}:${r.slug}`;
      if (byKey.has(key)) continue;
      byKey.set(key, {
        audience: r.audience,
        slug: r.slug,
        title: r.title,
        category: r.category || null,
        url: r.url || `/help-center/${r.audience}/article/${r.slug}`,
        content: r.content || r.text || '',
      });
    }
  }
  return [...byKey.values()].slice(0, MAX_SOURCES);
}

async function semanticSearch(admin, query, audience) {
  if (!supaEmbedConfigured()) return [];
  try {
    const queryEmbedding = await embedViaSupabaseCached(query);
    if (!queryEmbedding) return [];
    const { data, error } = await admin.rpc('match_help_articles', {
      query_embedding: queryEmbedding,
      match_audience: audience,
      match_threshold: SEMANTIC_THRESHOLD,
      match_count: MAX_SOURCES,
    });
    return !error && Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function keywordSearch(admin, query, audience) {
  const cols = 'audience, slug, title, category, url, content';
  const term = query.replace(/[%,]/g, ' ').trim();
  if (!term) return [];
  try {
    let ftq = admin
      .from('help_center_articles')
      .select(cols)
      .textSearch('tsv', query, { type: 'websearch', config: 'english' })
      .limit(MAX_SOURCES);
    if (audience) ftq = ftq.eq('audience', audience);
    let ilq = admin
      .from('help_center_articles')
      .select(cols)
      .ilike('title', `%${term}%`)
      .limit(MAX_SOURCES);
    if (audience) ilq = ilq.eq('audience', audience);
    const [ft, il] = await Promise.all([ftq, ilq]);
    return [...(ft.error ? [] : ft.data || []), ...(il.error ? [] : il.data || [])];
  } catch {
    return [];
  }
}

/**
 * Every layer for one audience. admin may be null (database not configured): then the
 * lexical index alone answers. -> { sources, matched } where matched is false when no
 * layer returned anything.
 */
export async function retrieveForAudience(query, audience, { admin = null, searchHelp } = {}) {
  /* The lexical index needs nothing but the content module, so it is the floor every
     other layer falls back to. */
  const lexical = searchHelp(query, { audience, limit: MAX_SOURCES, prefix: false }) || [];
  let semantic = [];
  let keyword = [];
  if (admin) {
    try {
      [semantic, keyword] = await Promise.all([
        semanticSearch(admin, query, audience),
        keywordSearch(admin, query, audience),
      ]);
    } catch {
      semantic = [];
      keyword = [];
    }
  }
  /* Lexical first when the database layers are empty; after them otherwise, so a live
     index keeps the lead. */
  const sources =
    semantic.length || keyword.length
      ? mergeSources(semantic, keyword, lexical)
      : mergeSources(lexical);
  return { sources, matched: Boolean(semantic.length || keyword.length || lexical.length) };
}

/**
 * Retrieval with the partner to user fallback, in one request.
 * -> { sources, answeredFrom } where answeredFrom is the audience the sources came from.
 */
export async function retrieveHelpSources(
  query,
  audience,
  { admin = null, searchHelp, timer } = {},
) {
  const run = (aud) => retrieveForAudience(query, aud, { admin, searchHelp });
  const first = timer ? await timer.time('retrieve', run(audience)) : await run(audience);
  if (audience === 'partner' && !first.matched) {
    const user = timer ? await timer.time('retrieve_fallback', run('user')) : await run('user');
    if (user.matched) return { sources: user.sources, answeredFrom: 'user' };
  }
  if (!first.matched && admin) logZeroResult(admin, 'help-center', query);
  return { sources: first.sources, answeredFrom: audience };
}
