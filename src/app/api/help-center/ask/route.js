import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { supaEmbedConfigured } from '@/lib/embeddings-gte';
import { embedViaSupabaseCached } from '@/lib/rag/embed-cached';
import { logZeroResult } from '@/lib/rag/zero-results';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { searchHelp } from '@/lib/help-center-search';

/**
 * POST /api/help-center/ask: grounded help-center Q&A (RAG).
 *
 * Body: { query, audience } (query 3 to 300 chars; audience 'user'|'partner').
 * Retrieval is hybrid and layered so there are always candidate articles:
 *   1. semantic: match_help_articles over help_center_articles (gte-small);
 *   2. keyword: tsv websearch + title ILIKE over the same table;
 *   3. lexical fallback: the in-repo index (src/lib/help-center-search.js),
 *      used whenever 1 and 2 return nothing, including when the table does
 *      not exist yet or the database is unreachable.
 * The top three distinct articles ground a short, plain answer. Every failure
 * degrades to { answer: null, sources } with a 200; this route never 500s, so
 * the page can always show article links. Answers are cached per
 * (audience, normalized query) for 24h in the function instance.
 *
 * Public (marketing surface), rate-limited.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ANTHROPIC_MODEL = 'claude-haiku-4-5';
const SEMANTIC_THRESHOLD = Number(process.env.HELP_CENTER_MATCH_THRESHOLD) || 0.3;
const MAX_SOURCES = 6;
const GROUNDING = 3;
const CACHE_TTL = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map();

const SYSTEM_PROMPT = `You are the Ezana Finance help assistant. Answer ONLY from the provided help-center excerpts. Write 3 to 4 plain sentences, second person, no markdown, no bullet points, no preamble. If the excerpts don't cover the question, say so in one sentence and suggest the closest article by its title. Never give investment advice. Never use em dashes or en dashes as punctuation; use commas, colons, periods or parentheses. Write menu paths as "Settings, then Integrations".`;

function cacheKey(audience, query) {
  return `${audience || 'all'}:${query.toLowerCase().replace(/\s+/g, ' ').trim()}`;
}

/** Merge rows from every retrieval layer, dedupe by (audience, slug), cap. */
function mergeSources(...layers) {
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

async function synthesize(query, sources) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { answer: null, degraded: 'no LLM key' };

  const context = sources
    .slice(0, GROUNDING)
    .map(
      (s) =>
        `[slug: ${s.slug}] [title: ${s.title}]${s.category ? ` [section: ${s.category}]` : ''}\n${(s.content || '').slice(0, 1800)}`,
    )
    .join('\n\n');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 220,
        temperature: 0.2,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Help-center excerpts:\n\n${context}\n\n---\nQuestion: ${query}`,
          },
        ],
      }),
    });
    if (!res.ok) return { answer: null, degraded: `llm ${res.status}` };
    const data = await res.json();
    const answer = data?.content?.[0]?.text?.trim();
    return answer ? { answer } : { answer: null, degraded: 'empty llm reply' };
  } catch (err) {
    return { answer: null, degraded: err?.message || 'llm error' };
  }
}

const publicSources = (sources) => sources.map(({ content, ...s }) => s);

export const POST = withApiGuard(
  async (request) => {
    const rl = await checkRateLimit(`help-center-ask:${getClientIp(request)}`, {
      limit: 15,
      window: '60 s',
    });
    if (!rl.success) return rateLimitResponse(rl);

    const body = await request.json().catch(() => ({}));
    const query = String(body?.query ?? body?.q ?? '').trim();
    const rawAudience = body?.audience ?? body?.center;
    const audience = rawAudience === 'partner' || rawAudience === 'user' ? rawAudience : null;

    if (query.length < 3 || query.length > 300) {
      return NextResponse.json(
        { error: 'Ask a question between 3 and 300 characters.' },
        { status: 400 },
      );
    }

    const key = cacheKey(audience, query);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL) return NextResponse.json(hit.body);

    /* The lexical index needs nothing but the content module, so it is the
       floor every other layer falls back to. */
    const lexical = searchHelp(query, { audience, limit: MAX_SOURCES, prefix: false });
    let sources = [];
    try {
      let semantic = [];
      let keyword = [];
      if (isServerSupabaseConfigured()) {
        const admin = getAdminClient();
        [semantic, keyword] = await Promise.all([
          semanticSearch(admin, query, audience),
          keywordSearch(admin, query, audience),
        ]);
        if (!semantic.length && !keyword.length && !lexical.length) {
          logZeroResult(admin, 'help-center', query);
        }
      }
      /* Lexical first when the database layers are empty; after them
         otherwise, so a live index keeps the lead. */
      sources =
        semantic.length || keyword.length
          ? mergeSources(semantic, keyword, lexical)
          : mergeSources(lexical);
    } catch {
      sources = mergeSources(lexical);
    }

    if (!sources.length) {
      return NextResponse.json({ answer: null, sources: [], grounded: false, empty: true });
    }

    const { answer, degraded } = await synthesize(query, sources);
    const payload = {
      answer: answer || null,
      grounded: Boolean(answer),
      degraded: degraded || undefined,
      sources: publicSources(sources.slice(0, GROUNDING)),
    };
    if (answer) {
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
      cache.set(key, { at: Date.now(), body: payload });
    }
    return NextResponse.json(payload);
  },
  { requireAuth: false },
);
