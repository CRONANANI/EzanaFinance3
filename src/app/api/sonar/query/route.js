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

// Synthesis model by plan depth so cost tracks revenue: cheap, versioned Haiku for
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
      return 'claude-haiku-4-5-20251001';
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

/**
 * Parse the Messages response content blocks. With web search the response is NOT a
 * single text block — it interleaves `text` (which may carry web citations),
 * `server_tool_use` (the web_search calls), and `web_search_tool_result` (the hits).
 * Concatenate all text, detect whether web ran, and collect distinct web sources.
 */
function parseAnthropicContent(content) {
  const blocks = Array.isArray(content) ? content : [];
  let text = '';
  let webUsed = false;
  const webSources = [];
  const seen = new Set();
  const addSource = (url, title) => {
    if (!url || seen.has(url) || webSources.length >= 8) return;
    seen.add(url);
    webSources.push({ url, title: title || url });
  };
  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue;
    if (b.type === 'text') {
      text += b.text || '';
      for (const c of b.citations || []) addSource(c.url, c.title);
    } else if (b.type === 'server_tool_use' && b.name === 'web_search') {
      webUsed = true;
    } else if (b.type === 'web_search_tool_result') {
      webUsed = true;
      const results = Array.isArray(b.content) ? b.content : [];
      for (const r of results) addSource(r?.url, r?.title);
    }
  }
  return { answer: text.trim(), webUsed, webSources };
}

async function synthesize(query, items, maxTokens, model, webSearch) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { answer: null, degraded: 'no LLM key' };
  try {
    const body = {
      model,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Ezana dataset sources:\n\n${buildContext(items)}\n\n---\nPing: ${query}\n\nWrite the Sonar briefing using the Ezana dataset sources above AND live web search where it adds current context. Weight them equally. Cite every claim — dataset claims with their [S#] marker and dataset name, web claims with their source. If coverage is thin, say so.`,
        },
      ],
    };
    // Anthropic's native web search tool (same key; returns citations; no third-party
    // vendor). The versioned type is required by the API. NOTE (SOC 2 / Law 25): the
    // ping text is sent to Anthropic's web search — do not pass user PII beyond it.
    if (webSearch?.enabled) {
      body.tools = [
        { type: 'web_search_20250305', name: 'web_search', max_uses: webSearch.maxUses },
      ];
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      // Log Anthropic's real error body (model access, request validity, …) — the
      // status alone hid the cause. Logs the model + status + error text only, never
      // the user's query/data.
      let detail = '';
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
      console.error('[sonar] synthesis LLM error', { model, status: res.status, detail });
      return { answer: null, degraded: `llm ${res.status}` };
    }
    const data = await res.json();
    const { answer, webUsed, webSources } = parseAnthropicContent(data?.content);
    return answer ? { answer, webUsed, webSources } : { answer: null, degraded: 'empty llm reply' };
  } catch (err) {
    return { answer: null, degraded: err?.message || 'llm error' };
  }
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

    const { items, corporaSearched, corporaUsed } = await orchestrate(query, {
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
    if (marked.length) {
      const out = await synthesize(
        query,
        marked,
        budget.maxTokens,
        modelForDepth(entitlements.depth),
        entitlements.webSearch,
      );
      answer = out.answer;
      degraded = out.degraded;
      grounded = Boolean(answer);
      webUsed = Boolean(out.webUsed);
      webSources = out.webSources || [];
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
