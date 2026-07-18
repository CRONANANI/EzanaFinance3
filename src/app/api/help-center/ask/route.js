import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

/**
 * POST /api/help-center/ask — grounded help-center Q&A (RAG).
 *
 * Body: { query, audience }. audience ∈ {'user','partner'} scopes retrieval to
 * that slice (help_center_articles.audience). Hybrid retrieve: semantic
 * (match_help_articles, gte-small 384-dim cosine) merged with a keyword ILIKE
 * fallback, then a grounded, cited answer synthesized ONLY from the retrieved
 * articles. Honest empty-state when nothing matches — never a hallucinated
 * answer. If the LLM key is absent it degrades to returning the source links.
 *
 * Public (marketing surface), rate-limited. The instant substring filter on the
 * page is unchanged and offline; this endpoint is only hit on submit.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ANTHROPIC_MODEL = 'claude-sonnet-4-5';
const SEMANTIC_THRESHOLD = Number(process.env.HELP_CENTER_MATCH_THRESHOLD) || 0.3;
const MAX_SOURCES = 6;

const SYSTEM_PROMPT = `You are Ezana Finance's help-center assistant. Answer the user's question using ONLY the provided help-center articles. Rules:
- Ground every statement in the provided articles. Do not use outside knowledge or invent features.
- Cite the article title(s) you drew from, inline, like: (see "Article Title").
- Be concise and practical — a short, direct answer, then next steps if useful.
- If the provided articles do not cover the question, say plainly that the help center doesn't cover it yet and suggest browsing the categories or contacting support. Do NOT guess.
- Never give financial or investment advice; describe how the product works only.`;

/** Merge semantic + keyword rows, dedupe by (audience, slug), cap. */
function mergeSources(semantic, keyword) {
  const byKey = new Map();
  for (const r of semantic || []) {
    byKey.set(`${r.audience}:${r.slug}`, {
      audience: r.audience,
      slug: r.slug,
      title: r.title,
      category: r.category || null,
      url: r.url,
      content: r.content || '',
      similarity: r.similarity != null ? Number(r.similarity) : null,
    });
  }
  for (const r of keyword || []) {
    const key = `${r.audience}:${r.slug}`;
    if (byKey.has(key)) continue; // semantic hit already has similarity
    byKey.set(key, {
      audience: r.audience,
      slug: r.slug,
      title: r.title,
      category: r.category || null,
      url: r.url,
      content: r.content || '',
      similarity: null, // keyword-only match
    });
  }
  return [...byKey.values()].slice(0, MAX_SOURCES);
}

async function keywordSearch(admin, query, audience) {
  const term = query.replace(/[%,]/g, ' ').trim();
  if (!term) return [];
  let q = admin
    .from('help_center_articles')
    .select('audience, slug, title, category, url, content')
    .or(`title.ilike.%${term}%,content.ilike.%${term}%`)
    .limit(MAX_SOURCES);
  if (audience) q = q.eq('audience', audience);
  const { data, error } = await q;
  if (error) return [];
  return Array.isArray(data) ? data : [];
}

async function synthesize(query, sources) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { answer: null, degraded: 'no LLM key' };

  const context = sources
    .map(
      (s, i) =>
        `[Article ${i + 1}] "${s.title}"${s.category ? ` (${s.category})` : ''}\n${(s.content || '').slice(0, 1500)}`,
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
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Help-center articles:\n\n${context}\n\n---\nQuestion: ${query}\n\nAnswer using only the articles above, citing titles.`,
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

export const POST = withApiGuard(
  async (request) => {
    const rl = await checkRateLimit(`help-center-ask:${getClientIp(request)}`, {
      limit: 15,
      window: '60 s',
    });
    if (!rl.success) return rateLimitResponse(rl);

    const body = await request.json().catch(() => ({}));
    const query = String(body?.query || '').trim().slice(0, 500);
    const audience = body?.audience === 'partner' || body?.audience === 'user' ? body.audience : null;

    if (!query) {
      return NextResponse.json({ error: 'A question is required.' }, { status: 400 });
    }

    const admin = getAdminClient();

    // 1) Semantic retrieval (best-effort — degrades to keyword if embed is off).
    let semantic = [];
    if (supaEmbedConfigured()) {
      const queryEmbedding = await embedViaSupabase(query);
      if (queryEmbedding) {
        const { data } = await admin.rpc('match_help_articles', {
          query_embedding: queryEmbedding,
          match_audience: audience,
          match_threshold: SEMANTIC_THRESHOLD,
          match_count: MAX_SOURCES,
        });
        semantic = Array.isArray(data) ? data : [];
      }
    }

    // 2) Keyword retrieval (always runs — catches exact terms semantics may miss).
    const keyword = await keywordSearch(admin, query, audience);

    const sources = mergeSources(semantic, keyword);

    // 3) Honest empty-state — no fabricated answer when nothing matches.
    if (!sources.length) {
      return NextResponse.json({
        answer: null,
        sources: [],
        grounded: false,
        empty: true,
      });
    }

    // 4) Grounded synthesis over the retrieved articles.
    const { answer, degraded } = await synthesize(query, sources);

    return NextResponse.json({
      answer: answer || null,
      grounded: Boolean(answer),
      degraded: degraded || undefined,
      sources: sources.map(({ content, ...s }) => s), // strip bodies from the response
    });
  },
  { requireAuth: false },
);
