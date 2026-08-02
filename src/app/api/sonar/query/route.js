import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getAdminClient, getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isActivePartner } from '@/lib/partner-access';
import { getActivePlan, getPlanTier } from '@/lib/subscription';
import { orchestrate } from '@/lib/research-copilot/orchestrate';
import { getSonarEntitlements, describeDatasetAccess, SONAR_DATASETS } from '@/lib/sonar/entitlements';
import {
  corporaForDatasets,
  depthBudget,
  classifyQuery,
  CORPUS_TO_DATASET,
} from '@/lib/sonar/retrieval';
import { synthesizeWithFallback } from '@/lib/sonar/llm-providers';

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
  'Sonar synthesizes sourced research from Ezana’s datasets — not financial advice or a recommendation to buy or sell any security.';

const SYSTEM_PROMPT = `You are Ezana Sonar, a research/intelligence surface. A user "pings" a subject and you return a briefing that draws on TWO equally-authoritative kinds of source: (1) Ezana's provided dataset sources (Echo editorial, congressional trades, government contracts, prediction markets, and — for org members — their council's internal notes), and (2) live web search results (use the web_search tool for current context when it helps). Rules:
- Ground EVERY claim in a source and cite it. Cite dataset claims inline with their marker, e.g. [S1], naming the dataset in prose. Cite web claims to their web source (the web_search tool returns citations — attribute them).
- Weight the two source kinds EQUALLY. Ezana's datasets are the differentiator (the cross-dataset join is the value), and live web adds current context — cross-reference them: where they corroborate or diverge, say so.
- If neither the datasets nor the web cover the subject, say so plainly — never fabricate, never fill gaps with ungrounded knowledge.
- Present findings only. Do NOT give financial or investment advice, price targets, or buy/sell/hold calls.
- Open with a one-sentence headline read, then the analysis. Be concise, analytical, terminal-adjacent.
- Never describe yourself as "AGI" or a general intelligence; you are a research surface over specific datasets plus live web.`;

function startOfUtcDayISO() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

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

function buildUserPrompt(query, items) {
  return `Ezana dataset sources:\n\n${buildContext(items)}\n\n---\nPing: ${query}\n\nWrite the Sonar briefing using the Ezana dataset sources above AND live web search where it adds current context. Weight them equally. Cite every claim — dataset claims with their [S#] marker and dataset name, web claims with their source. If coverage is thin, say so.`;
}

function looksLikeAdvice(text) {
  return /\b(you should (buy|sell)|i recommend|we recommend|strong buy|price target|go long|go short)\b/i.test(
    String(text || ''),
  );
}

export const POST = withApiGuard(
  async (request, user) => {
    const body = await request.json().catch(() => ({}));
    const query = String(body?.query || '')
      .trim()
      .slice(0, 800);
    if (!query) {
      return NextResponse.json({ error: 'Type something to ping.' }, { status: 400 });
    }

    const admin = getAdminClient();
    const userClient = getUserClient();

    // 1. Resolve the user context: plan tier × version (regular/partner/org).
    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_plan, subscription_status, one_time_plan')
      .eq('id', user.id)
      .maybeSingle();
    const planTier = getPlanTier(getActivePlan(profile));

    const member = await getCurrentOrgMember(userClient).catch(() => null);
    const isPartner = await isActivePartner(userClient, user).catch(() => false);
    const version = member ? 'org' : isPartner ? 'partner' : 'regular';

    // 2. The entitlement matrix — the single source of truth for this query.
    const entitlements = getSonarEntitlements({
      planTier,
      version,
      isPartner,
      orgRole: member?.role || null,
    });
    const { available, locked } = describeDatasetAccess(entitlements);

    // 3. Daily quota — enforced server-side. Over-limit is an upgrade surface,
    //    not an error.
    const { count: usedToday } = await admin
      .from('sonar_queries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfUtcDayISO());
    const used = usedToday || 0;
    if (used >= entitlements.dailyQueries) {
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

    const { items, corporaSearched, corporaUsed, rerankUsed, rewriteUsed } = await orchestrate(query, {
      admin,
      supabaseUser: userClient,
      member,
      allowCorpora,
      topK: budget.topK,
      perCorpusCap: budget.perCorpusCap,
      charBudget: budget.charBudget,
    });

    const marked = items.map((it, i) => ({ ...it, marker: `S${i + 1}` }));

    // The "what Sonar searched" manifest — entitled + wired datasets, flagged for
    // whether each actually returned anything.
    const usedCorpora = new Set(corporaUsed);
    const searched = corporaSearched
      .map((corpus) => {
        const id = CORPUS_TO_DATASET[corpus];
        const meta = SONAR_DATASETS[id];
        return meta ? { ...meta, used: usedCorpora.has(corpus) } : null;
      })
      .filter(Boolean);

    // 6. Synthesize — grounded + cited, over the datasets AND (tiered) live web.
    //    Honest empty-state when retrieval is dry.
    let answer = null;
    let grounded = false;
    let degraded;
    let webUsed = false;
    let webSources = [];
    let synthProvider = null;
    if (marked.length) {
      // Multi-provider fallback: Anthropic (with web search) → Kimi → DeepSeek. If the
      // primary is out of credits / rate-limited / down, synthesis fails over to a
      // fallback so the briefing still renders; only if ALL fail is it degraded.
      const out = await synthesizeWithFallback({
        system: SYSTEM_PROMPT,
        user: buildUserPrompt(query, marked),
        maxTokens: budget.maxTokens,
        model: modelForDepth(entitlements.depth),
        fallbackModel: HAIKU_MODEL,
        webSearch: entitlements.webSearch,
      });
      answer = out.answer;
      degraded = out.degraded;
      grounded = Boolean(answer);
      webUsed = Boolean(out.webUsed);
      webSources = out.webSources || [];
      synthProvider = out.provider || null;
      // Chronic failover to a fallback signals the Anthropic account needs attention
      // (billing/limits) — log it so the chain never silently masks that.
      if (synthProvider && synthProvider !== 'anthropic') {
        console.warn('[sonar] synthesis served by fallback provider', { provider: synthProvider });
      }
    }

    // Surface "Live web" in the manifest when web search actually ran — a hit when
    // it returned sources, otherwise searched-no-hit.
    if (webUsed) {
      searched.push({
        id: 'web',
        label: 'Live web',
        source: 'Anthropic web search',
        used: webSources.length > 0,
      });
    }

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
    const sections = [...sectionMap.values()];

    // 7. Log the query (quota accounting + audit). Service-role insert.
    await admin
      .from('sonar_queries')
      .insert({
        user_id: user.id,
        query_text: query,
        classification,
        version,
        plan_tier: planTier,
        datasets_searched: searched.map((d) => d.id),
        grounded,
      })
      .then(
        () => {},
        () => {},
      );

    return NextResponse.json({
      query,
      classification,
      version,
      depth: entitlements.depth,
      exportsEnabled: entitlements.exportsEnabled,
      briefing: answer,
      grounded,
      synthProvider: synthProvider || undefined,
      rerankUsed: Boolean(rerankUsed),
      rewriteUsed: Boolean(rewriteUsed),
      empty: marked.length === 0,
      advice_flagged: answer ? looksLikeAdvice(answer) : false,
      degraded: degraded || undefined,
      sections,
      searched,
      webSources,
      locked,
      quota: {
        limit: entitlements.dailyQueries,
        used: used + 1,
        remaining: Math.max(0, entitlements.dailyQueries - used - 1),
      },
      available: available.map((d) => d.id),
      disclaimer: DISCLAIMER,
    });
  },
  { strict: true },
);
