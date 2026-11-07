import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getAdminClient, getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isActivePartner } from '@/lib/partner-access';
import { getActivePlan, getPlanTier } from '@/lib/subscription';
import { getReferralPlanOverride } from '@/lib/referrals-server';
import { orchestrate } from '@/lib/research-copilot/orchestrate';
import {
  getSonarEntitlements,
  describeDatasetAccess,
  SONAR_DATASETS,
} from '@/lib/sonar/entitlements';
import {
  corporaForDatasets,
  depthBudget,
  classifyQuery,
  CORPUS_TO_DATASET,
} from '@/lib/sonar/retrieval';
import { enforceGrounding, createSentenceGate, GROUNDING_RULES } from '@/lib/sonar/groundingGuard';
import { synthesizeWithFallback, streamSynthesis } from '@/lib/sonar/llm-providers';
import { cacheGet, cacheSet } from '@/lib/cache';
import {
  sonarAnswerCacheKey,
  cacheableSearch,
  shouldCacheSonarAnswer,
  SONAR_ANSWER_TTL_SECONDS,
} from '@/lib/sonar/answer-cache';
import { removeEmDashes } from '@/lib/text/em-dash';
import { logZeroResult } from '@/lib/rag/zero-results';
import { reservePing, completePing, failPing, annotatePing } from '@/lib/sonar/quota';
import { createRequestTimer } from '@/lib/rag/request-timer';

import { withNoEmDash } from '@/lib/text/no-em-dash-response';
/**
 * POST /api/sonar/query — Ezana Sonar's cross-dataset intelligence surface.
 *
 * A single ping (person, bank, policy, ticker, bill, username) is classified,
 * then retrieved across ONLY the datasets the user is entitled to (plan tier ×
 * version), and synthesized into a grounded, cited briefing. Every gate is
 * enforced server-side: withApiGuard (auth + strict rate limit), the entitlement
 * matrix (datasets/depth), and a per-user daily quota. Synthesis is grounded in
 * retrieved data and cites it — thin data yields an honest "limited data", never
 * a fabrication. Sonar is a research/intelligence surface, not "AGI".
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Web search + synthesis can take longer than a dataset-only synthesis; allow more
// serverless headroom so the request doesn't time out mid-search.
export const maxDuration = 60;

// Versioned Haiku — the safe, cheap, confirmed-working model. Also the fallback
// model when a richer request 400s (e.g. deep-tier model access or the web tool).
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// Synthesis model by plan depth so cost tracks revenue: cheap Haiku for
// free/standard grounded summaries; a stronger model for paid "deep" synthesis.
// (Grounded summarization doesn't need a frontier model — Haiku is plenty and ~10x
// cheaper on the same Anthropic key.)
function modelForDepth(depth) {
  switch (depth) {
    case 'deep':
      return 'claude-sonnet-5';
    case 'standard':
    case 'summary':
    default:
      return HAIKU_MODEL;
  }
}

const DISCLAIMER =
  'Sonar synthesizes sourced research from Ezana’s datasets, not financial advice or a recommendation to buy or sell any security.';

const SYSTEM_PROMPT = `You are Ezana Sonar, a research/intelligence surface. A user "pings" a subject and you return a briefing that draws on TWO equally-authoritative kinds of source: (1) Ezana's provided dataset sources (Echo editorial, congressional trades, government contracts, prediction markets, and, for org members, their council's internal notes), and (2) live web search results (use the web_search tool for current context when it helps). Rules:
- Ground EVERY claim in a source and cite it. Cite dataset claims inline with their marker, e.g. [S1], naming the dataset in prose. Cite web claims to their web source (the web_search tool returns citations, attribute them).
- Weight the two source kinds EQUALLY. Ezana's datasets are the differentiator (the cross-dataset join is the value), and live web adds current context, cross-reference them: where they corroborate or diverge, say so.
- If neither the datasets nor the web cover the subject, say so plainly, never fabricate, never fill gaps with ungrounded knowledge.
- Present findings only. Do NOT give financial or investment advice, price targets, or buy/sell/hold calls.
- Open with a one-sentence headline read, then the analysis. Be concise, analytical, terminal-adjacent.
- Never describe yourself as "AGI" or a general intelligence; you are a research surface over specific datasets plus live web.
- Style: plain language, no hype, no em dashes. If the ping is not a finance-adjacent entity, answer briefly and suggest a better ping.`;

function buildContext(items) {
  return items
    .map((it) => {
      const label = SONAR_DATASETS[CORPUS_TO_DATASET[it.corpus]]?.label || it.corpus;
      const tags = [];
      if (it.meta?.ticker) tags.push(it.meta.ticker);
      if (it.date) tags.push(String(it.date).slice(0, 10));
      const tagStr = tags.length ? ` (${tags.join(', ')})` : '';
      return `[${it.marker} · ${label}] "${it.title}"${tagStr}\n${it.snippet || ''}`;
    })
    .join('\n\n');
}

function buildUserPrompt(query, items, context) {
  const prior = context ? `Previous ping in this thread (for context only): ${context}\n\n` : '';
  return `${prior}Ezana dataset sources:\n\n${buildContext(items)}\n\n---\nPing: ${query}\n\nWrite the Sonar briefing using the Ezana dataset sources above AND live web search where it adds current context. Weight them equally. Cite every claim: dataset claims with their [S#] marker and dataset name, web claims with their source. If coverage is thin, say so.`;
}

function looksLikeAdvice(text) {
  return /\b(you should (buy|sell)|i recommend|we recommend|strong buy|price target|go long|go short)\b/i.test(
    String(text || ''),
  );
}

async function handlePing(request, user, ping) {
  {
    /* Per-stage latency (rag_request_timings). Telemetry only: never awaited, never
       fails the response. */
    const timer = createRequestTimer('sonar-query');
    const body = await request.json().catch(() => ({}));
    // Strict input contract (cost control): control chars stripped, 2-300 chars
    // REJECTED rather than silently truncated, so an oversized paste never
    // reaches retrieval or the model.
    const query = String(body?.query || '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (query.length < 2) {
      return NextResponse.json({ error: 'Type something to ping.' }, { status: 400 });
    }
    if (query.length > 600) {
      return NextResponse.json({ error: 'Keep pings under 600 characters.' }, { status: 400 });
    }
    // Follow-up context: at most ONE prior turn, same sanitation as the query.
    // Used by the dossier's follow-up pill so "Compare to RTX" knows what "this"
    // refers to. Anything longer or older is dropped, never accumulated.
    const context = String(body?.context || '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300);

    const admin = getAdminClient();

    const userClient = getUserClient();

    // 1. Resolve the user context: plan tier x version (regular/partner/org).
    //    The reads are independent, so they go out together. The quota and
    //    the global cap are checked by the reservation in step 3.
    const [{ data: profile }, member, isPartner, referralPlan] = await Promise.all([
      admin
        .from('profiles')
        .select('subscription_plan, subscription_status, one_time_plan')
        .eq('id', user.id)
        .maybeSingle(),
      getCurrentOrgMember(userClient).catch(() => null),
      isActivePartner(userClient, user).catch(() => false),
      getReferralPlanOverride(admin, user.id),
    ]);
    const planTier = getPlanTier(getActivePlan(profile, referralPlan));
    const version = member ? 'org' : isPartner ? 'partner' : 'regular';

    // 2. The entitlement matrix — the single source of truth for this query.
    const entitlements = getSonarEntitlements({
      planTier,
      version,
      isPartner,
      orgRole: member?.role || null,
    });
    const { available, locked } = describeDatasetAccess(entitlements);

    // 3. Daily quota and the global cap, enforced server-side BEFORE any
    //    retrieval or model spend: reserve_sonar_ping counts and inserts a
    //    'reserved' ledger row under a lock, so parallel pings cannot all
    //    pass the same count. Over-limit is an upgrade surface, not an error.
    const reservation = await reservePing(admin, {
      userId: user.id,
      limit: entitlements.dailyQueries,
      query,
      version,
      planTier,
    });
    if (!reservation.ok && reservation.reason !== 'quota') {
      if (reservation.reason === 'global') console.warn('[sonar] global daily cap reached');
      return NextResponse.json(
        { error: 'That ping did not land. Try again in a moment.' },
        { status: reservation.reason === 'global' ? 429 : 503 },
      );
    }
    ping.reservation = reservation.ok ? reservation : null;
    const used = reservation.used || 0;
    if (!reservation.ok) {
      timer.set('gate', timer.elapsed());
      timer.finish(admin, { degraded: 'quota' });
      return NextResponse.json({
        quotaExceeded: true,
        message: `You've used all ${entitlements.dailyQueries} Sonar pings for today. Upgrade for a higher daily quota and deeper synthesis.`,
        quota: { limit: entitlements.dailyQueries, used, remaining: 0 },
        locked,
        version,
        disclaimer: DISCLAIMER,
      });
    }

    // 4. Classify the ping (informational) and 5. retrieve from ONLY the entitled
    //    corpora, at the entitled depth. Org scope is enforced inside the org
    //    retriever via RLS (member + cookie-scoped client).
    const classification = classifyQuery(query);
    const allowCorpora = corporaForDatasets(entitlements.datasets);
    const budget = depthBudget(entitlements.depth);
    /* Nov 2026: a client that asks for text/event-stream gets the answer as it is
       written; every other caller (tests, the eval harness) keeps the JSON body. */
    const wantsStream =
      /text\/event-stream/i.test(request.headers.get('accept') || '') || body?.stream === true;
    const webSearchOn =
      Boolean(entitlements.webSearch?.enabled) && process.env.SONAR_WEB_SEARCH === 'true';
    /* Synthesis must end inside maxDuration (60 s): request start + 55 s. */
    const deadlineAt = Date.now() - timer.elapsed() + 55_000;
    const quota = {
      limit: entitlements.dailyQueries,
      used: used + 1,
      remaining: Math.max(0, entitlements.dailyQueries - used - 1),
    };

    timer.set('gate', timer.elapsed());

    // Answer cache (15 min). Never for a ping that searches an org's own notes.
    const cacheKey =
      member && !cacheableSearch(allowCorpora)
        ? null
        : sonarAnswerCacheKey({
            query,
            context,
            depth: entitlements.depth,
            datasets: entitlements.datasets,
            webSearch: webSearchOn,
          });
    if (cacheKey) {
      const hit = await cacheGet(cacheKey, { memTtlSeconds: 60 }).catch(() => undefined);
      if (hit?.briefing) {
        await timer.time(
          'ledger',
          completePing(admin, reservation, {
            classification: hit.classification ?? classification,
            datasets_searched: (hit.searched || []).map((d) => d.id),
            grounded: true,
          }),
        );
        ping.completed = true;
        annotatePing(admin, reservation, { durationMs: timer.elapsed() }).catch(() => {});
        timer.finish(admin, { cacheHit: true, streamed: wantsStream });
        const payload = { ...hit, quota };
        if (!wantsStream) return NextResponse.json(payload);
        return sseResponse(async (send) => {
          timer.firstByte();
          send('meta', metaOf(payload));
          send('delta', { text: payload.briefing });
          send('done', doneOf(payload));
        });
      }
    }

    /* Retrieval: bounded like the landing pipeline's legs, embedding the query while the
       optional rewrite runs. */
    const retrieve = async () => {
      const { items, corporaSearched, corporaUsed, rerankUsed, rewriteUsed, timings } =
        await orchestrate(query, {
          admin,
          supabaseUser: userClient,
          member,
          allowCorpora,
          topK: budget.topK,
          perCorpusCap: budget.perCorpusCap,
          charBudget: budget.charBudget,
          embedTimeoutMs: 1500,
          rerankTimeoutMs: 1800,
          retrieverTimeoutMs: 4000,
          speculativeEmbed: true,
        });
      for (const k of ['rewrite', 'embed', 'retrieve', 'rerank']) timer.set(k, timings?.[k] || 0);

      const marked = items.map((it, i) => ({ ...it, marker: `S${i + 1}` }));
      // Zero-result telemetry: an empty retrieval is a content gap (fire-and-forget).
      if (!marked.length) logZeroResult(admin, 'sonar', query);

      // The "what Sonar searched" manifest: entitled + wired datasets, flagged for
      // whether each actually returned anything.
      const usedCorpora = new Set(corporaUsed);
      const searched = corporaSearched
        .map((corpus) => {
          const id = CORPUS_TO_DATASET[corpus];
          const meta = SONAR_DATASETS[id];
          return meta ? { ...meta, used: usedCorpora.has(corpus) } : null;
        })
        .filter(Boolean);

      // Group retrieved items into dataset-labeled, cited sections.
      const sectionMap = new Map();
      for (const it of marked) {
        const id = CORPUS_TO_DATASET[it.corpus];
        const meta = SONAR_DATASETS[id];
        if (!meta) continue;
        if (!sectionMap.has(id)) sectionMap.set(id, { ...meta, items: [] });
        sectionMap.get(id).items.push({
          marker: it.marker,
          title: it.title,
          url: it.url || null,
          date: it.date || null,
          snippet: it.snippet || null,
          similarity: it.similarity != null ? Number(it.similarity.toFixed(3)) : null,
          ticker: it.meta?.ticker || null,
        });
      }
      const meta = {
        query,
        classification,
        version,
        depth: entitlements.depth,
        exportsEnabled: entitlements.exportsEnabled,
        sections: [...sectionMap.values()],
        searched,
        locked,
        available: available.map((d) => d.id),
        quota,
        disclaimer: DISCLAIMER,
        empty: marked.length === 0,
        rerankUsed: Boolean(rerankUsed),
        rewriteUsed: Boolean(rewriteUsed),
      };
      const synthArgs = {
        system: SYSTEM_PROMPT + GROUNDING_RULES,
        user: buildUserPrompt(query, marked, context),
        maxTokens: budget.maxTokens,
        model: modelForDepth(entitlements.depth),
        fallbackModel: HAIKU_MODEL,
        webSearch: entitlements.webSearch,
        deadlineAt,
      };
      const datasetFindings = marked.map(
        (m) => `${m.title || ''}. ${String(m.text || m.snippet || '')}`,
      );
      return { marked, meta, synthArgs, datasetFindings, corporaSearched, corporaUsed };
    };

    /* "Live web" in the manifest when web search actually ran: a hit when it returned
       sources, otherwise searched-no-hit. */
    const withWeb = (searched, out) =>
      out?.webUsed
        ? [
            ...searched,
            {
              id: 'web',
              label: 'Live web',
              source: 'Anthropic web search',
              used: (out.webSources || []).length > 0,
            },
          ]
        : searched;

    /* Complete the reserved ledger row (quota accounting + audit), the ledger time, the
       timing row and the cache, in that order. */
    const finishPing = async (payload, r, { streamed = false } = {}) => {
      await timer.time(
        'ledger',
        completePing(admin, reservation, {
          classification,
          datasets_searched: payload.searched.map((d) => d.id),
          grounded: payload.grounded,
        }),
      );
      ping.completed = true;
      /* Quick-answer time on the ledger, with no mode, so research estimates (which
         filter by mode) are not mixed with quick answers. Fire-and-forget. */
      annotatePing(admin, reservation, { durationMs: timer.elapsed() }).catch(() => {});
      timer.finish(admin, {
        streamed,
        degraded: payload.degraded || (payload.empty ? 'empty' : null),
      });
      if (
        cacheKey &&
        shouldCacheSonarAnswer(payload, {
          corporaSearched: r.corporaSearched,
          corporaUsed: r.corporaUsed,
        })
      ) {
        const { quota: _quota, degradedDetail: _detail, ...stored } = payload;
        await cacheSet(cacheKey, stored, SONAR_ANSWER_TTL_SECONDS, { memTtlSeconds: 60 }).catch(
          () => {},
        );
      }
    };

    if (!wantsStream) {
      const r = await retrieve();
      const { marked, synthArgs } = r;

      // 6. Synthesize: grounded + cited, over the datasets AND (tiered) live web.
      //    Honest empty-state when retrieval is dry.
      let answer = null;
      let out = null;
      let degradedDetail;
      if (marked.length) {
        // Multi-provider fallback: Anthropic (with web search), Kimi, DeepSeek. If the
        // primary is out of credits / rate-limited / down, synthesis fails over to a
        // fallback so the briefing still renders; only if ALL fail is it degraded.
        out = await timer.time('synth', synthesizeWithFallback(synthArgs));
        answer = out.answer;
        /* A negative claim no snippet or web result supports is regenerated
           once, then removed (groundingGuard.js). */
        if (answer) {
          const guarded = await timer.time('grounding', () =>
            enforceGrounding(
              answer,
              [...r.datasetFindings, ...(out.webCitedText || [])],
              async (extra) =>
                (
                  await synthesizeWithFallback({
                    ...synthArgs,
                    system: `${synthArgs.system}\n${extra}`,
                  })
                )?.answer || null,
            ),
          );
          timer.set('grounding_regen', guarded.regenerated ? 1 : 0);
          answer = guarded.text;
        }
        // Dev ergonomics: the per-provider failure summary rides the JSON payload
        // in development so the browser network tab shows the real failure;
        // production keeps the generic user-facing state (logs carry the detail).
        if (!answer && process.env.NODE_ENV !== 'production' && out.providerErrors?.length) {
          degradedDetail = out.providerErrors;
        }
        logFallback(out.provider);
      }
      const payload = {
        ...r.meta,
        briefing: answer,
        degradedDetail,
        grounded: Boolean(answer),
        synthProvider: out?.provider || undefined,
        advice_flagged: answer ? looksLikeAdvice(answer) : false,
        degraded: out?.degraded || undefined,
        searched: withWeb(r.meta.searched, out),
        webSources: out?.webSources || [],
      };
      await finishPing(payload, r);
      return NextResponse.json(payload);
    }

    /* Stream: the ping is reserved; retrieval runs inside the stream so the client sees
       the dashboard modules (meta) as soon as retrieval lands, then the answer as it is
       written. Each sentence passes the grounding gate before it is sent; there is no
       regeneration on this path, because text on screen cannot be taken back. */
    ping.completed = true; /* this handler owns the reservation from here */
    const abort = new AbortController();
    request.signal?.addEventListener?.('abort', () => abort.abort());
    return sseResponse(async (send) => {
      let textSent = false;
      let r = null;
      try {
        r = await retrieve();
        send('meta', r.meta);
        if (!r.marked.length) {
          const payload = {
            ...r.meta,
            briefing: null,
            grounded: false,
            advice_flagged: false,
            webSources: [],
          };
          await finishPing(payload, r, { streamed: true });
          send('done', doneOf(payload));
          return;
        }

        const webCited = [];
        const gate = createSentenceGate(() => [...r.datasetFindings, ...webCited], {
          holdFlagged: webSearchOn,
        });
        let briefing = '';
        const release = (piece) => {
          if (!piece) return;
          const clean = removeEmDashes(piece);
          briefing += clean;
          if (!textSent) timer.firstByte();
          textSent = true;
          send('delta', { text: clean });
        };
        const out = await timer.time('synth', () =>
          streamSynthesis(r.synthArgs, {
            signal: abort.signal,
            onText: (d) => release(gate.push(d)),
            onCitation: (t) => webCited.push(t),
          }),
        );
        if (abort.signal.aborted) throw Object.assign(new Error('client gone'), { abort: true });
        /* The tail, and any sentence held for web citations, checked against the final
           findings (every passage the model cited). */
        webCited.splice(0, webCited.length, ...(out.webCitedText || webCited));
        release(gate.flush());
        timer.set('grounding_removed', gate.removed.length);
        if (gate.removed.length) {
          console.info('[sonar] stream gate removed sentences', { count: gate.removed.length });
        }
        logFallback(out.provider);

        const answer = briefing.trim() ? briefing : null;
        const payload = {
          ...r.meta,
          briefing: answer,
          grounded: Boolean(answer),
          synthProvider: out.provider || undefined,
          advice_flagged: answer ? looksLikeAdvice(answer) : false,
          degraded: out.degraded || undefined,
          degradedDetail:
            !answer && process.env.NODE_ENV !== 'production' && out.providerErrors?.length
              ? out.providerErrors
              : undefined,
          searched: withWeb(r.meta.searched, out),
          webSources: out.webSources || [],
        };
        await finishPing(payload, r, { streamed: true });
        send('done', doneOf(payload));
      } catch (e) {
        const gone = abort.signal.aborted || e?.abort;
        if (!gone) console.error('[sonar] stream failed', { message: e?.message });
        if (textSent && r) {
          /* Text already reached the reader: the ping counts, marked degraded. */
          await completePing(admin, reservation, {
            classification,
            datasets_searched: r.meta.searched.map((d) => d.id),
            grounded: true,
          }).catch(() => {});
          timer.finish(admin, { streamed: true, degraded: gone ? 'client_abort' : 'stream_error' });
        } else {
          await failPing(admin, reservation).catch(() => {});
          timer.finish(admin, { streamed: true, degraded: gone ? 'client_abort' : 'stream_error' });
        }
        if (!gone) send('error', { error: 'That ping did not land. Try again.' });
      }
    });
  }
}

/* Chronic failover to a fallback signals the Anthropic account needs attention
   (billing/limits): log it so the chain never silently masks that. */
function logFallback(provider) {
  if (provider && provider !== 'anthropic') {
    console.warn('[sonar] synthesis served by fallback provider', { provider });
  }
}

/* The stream's first event: everything the final JSON carries except the answer. */
function metaOf(p) {
  return {
    query: p.query,
    classification: p.classification,
    version: p.version,
    depth: p.depth,
    exportsEnabled: p.exportsEnabled,
    sections: p.sections,
    searched: p.searched,
    locked: p.locked,
    available: p.available,
    quota: p.quota,
    disclaimer: p.disclaimer,
    empty: p.empty,
    rerankUsed: p.rerankUsed,
    rewriteUsed: p.rewriteUsed,
  };
}

/* The stream's last event: the final answer and what it drew on. */
function doneOf(p) {
  return {
    briefing: p.briefing,
    grounded: p.grounded,
    degraded: p.degraded,
    degradedDetail: p.degradedDetail,
    webSources: p.webSources || [],
    searched: p.searched,
    advice_flagged: p.advice_flagged,
    synthProvider: p.synthProvider,
  };
}

/* Server-Sent Events, framed like /api/sonar/research: `event:` + `data:` blocks and a
   keep-alive comment every 10 s. `work(send)` runs once; the stream closes after it. */
function sseResponse(work) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const write = (chunk) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };
      const send = (event, data) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      const beat = setInterval(() => write(': keep-alive\n\n'), 10_000);
      try {
        await work(send);
      } finally {
        clearInterval(beat);
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

/* The reservation made inside handlePing is released if the ping fails
   (throws or answers with an error), so a failed ping is not counted. */
const POST_HANDLER = withApiGuard(
  async (request, user) => {
    const ping = { reservation: null };
    try {
      const res = await handlePing(request, user, ping);
      if (ping.reservation && !ping.completed && res.status >= 400) {
        await failPing(getAdminClient(), ping.reservation);
      }
      return res;
    } catch (e) {
      if (ping.reservation && !ping.completed) await failPing(getAdminClient(), ping.reservation);
      throw e;
    }
  },
  { strict: true },
);

/* No em dashes in anything this route returns (src/lib/text/em-dash.js). */
export const POST = withNoEmDash(POST_HANDLER);
