import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { searchHelp } from '@/lib/help-center-search';
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { createRequestTimer } from '@/lib/rag/request-timer';
import { cacheGet, cacheSet } from '@/lib/cache';
import {
  GROUNDING,
  helpCacheKey,
  retrieveHelpSources,
  shouldCacheHelp,
} from '@/lib/help-center-ask';

import { withNoEmDash } from '@/lib/text/no-em-dash-response';
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
 * the page can always show article links. A partner question no layer matches is
 * answered from the user help center in the same request (answeredFrom: 'user').
 * Grounded answers are cached per (audience, normalized query) for 24h in the shared
 * cache (src/lib/cache.js: in-process plus Redis when configured). Retrieval lives in
 * src/lib/help-center-ask.js.
 *
 * Public (marketing surface), rate-limited.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ANTHROPIC_MODEL = 'claude-haiku-4-5';
const CACHE_TTL_SECONDS = 24 * 60 * 60;
const CACHE_MEM_TTL_SECONDS = 5 * 60;
/* A 220-token Haiku reply needs a few seconds; past 8 s the route returns the sources
   (degraded) instead of holding the page. */
const SYNTH_TIMEOUT_MS = 8000;

const SYSTEM_PROMPT = `You are the Ezana Finance help assistant. Answer ONLY from the provided help-center excerpts. Write 3 to 4 plain sentences, second person, no markdown, no bullet points, no preamble. If the excerpts don't cover the question, say so in one sentence and suggest the closest article by its title. Never give investment advice. Never use em dashes or en dashes as punctuation; use commas, colons, periods or parentheses. Write menu paths as "Settings, then Integrations".`;

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
    const res = await fetchWithTimeout(
      'https://api.anthropic.com/v1/messages',
      {
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
      },
      SYNTH_TIMEOUT_MS,
    );
    if (!res.ok) return { answer: null, degraded: `llm ${res.status}` };
    const data = await res.json();
    const answer = data?.content?.[0]?.text?.trim();
    return answer ? { answer } : { answer: null, degraded: 'empty llm reply' };
  } catch (err) {
    return { answer: null, degraded: err?.message || 'llm error' };
  }
}

const publicSources = (sources) => sources.map(({ content, ...s }) => s);

const POST_HANDLER = withApiGuard(
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

    /* Per-stage latency (rag_request_timings). Telemetry only: never awaited, never
       fails the response. */
    const timer = createRequestTimer('help-center');
    const timingAdmin = isServerSupabaseConfigured() ? getAdminClient() : null;

    const key = helpCacheKey(audience, query);
    const hit = await cacheGet(key, { memTtlSeconds: CACHE_MEM_TTL_SECONDS });
    if (hit) {
      timer.finish(timingAdmin, { cacheHit: true });
      return NextResponse.json(hit);
    }

    let sources = [];
    let answeredFrom = audience;
    try {
      ({ sources, answeredFrom } = await retrieveHelpSources(query, audience, {
        admin: timingAdmin,
        searchHelp,
        timer,
      }));
    } catch {
      sources = [];
    }

    if (!sources.length) {
      timer.finish(timingAdmin, { degraded: 'empty' });
      return NextResponse.json({ answer: null, sources: [], grounded: false, empty: true });
    }

    const { answer, degraded } = await timer.time('synth', synthesize(query, sources));
    timer.finish(timingAdmin, { degraded: degraded || null });
    const payload = {
      answer: answer || null,
      grounded: Boolean(answer),
      degraded: degraded || undefined,
      answeredFrom,
      sources: publicSources(sources.slice(0, GROUNDING)),
    };
    /* Cached under the requested audience, so the next partner asker gets the same
       user-center answer without the fallback. */
    if (shouldCacheHelp(payload)) {
      /* Awaited (a few ms): a serverless instance can freeze once the response is sent. */
      await cacheSet(key, payload, CACHE_TTL_SECONDS, {
        memTtlSeconds: CACHE_MEM_TTL_SECONDS,
      }).catch(() => {});
    }
    return NextResponse.json(payload);
  },
  { requireAuth: false },
);

/* No em dashes in anything this route returns (src/lib/text/em-dash.js). */
export const POST = withNoEmDash(POST_HANDLER);
