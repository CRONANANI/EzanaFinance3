/**
 * Sonar synthesis — multi-provider LLM fallback chain (Anthropic → Kimi → DeepSeek).
 *
 * If the primary LLM (Anthropic) is unavailable — out of credits (400 "credit balance
 * too low"), rate-limited (429), or having an outage (5xx) — synthesis automatically
 * falls back to the next enabled provider so the Sonar Live Briefing keeps working.
 * Only when EVERY provider fails does the route fall back to the "sourced matches"
 * degraded state. Providers try in array order: Anthropic first (native web search +
 * [S#] dataset citations), then Kimi (Moonshot), then DeepSeek.
 *
 * ── COMPLIANCE (SOC 2 / Law 25 / PIPEDA) ─────────────────────────────────────────
 * The fallback providers (Kimi/Moonshot and DeepSeek) are CHINESE-HOSTED inference.
 * When Anthropic is unavailable and a fallback fires, Sonar sends the ping text plus
 * the retrieved public dataset context (Echo editorial, congressional trades, gov
 * contracts, prediction markets — the same [S#] source snippets) to that provider.
 * This is a known, accepted data-governance tradeoff. It is gated behind the
 * SONAR_FALLBACK_KIMI / SONAR_FALLBACK_DEEPSEEK env toggles so offshore routing can
 * be disabled INSTANTLY (no deploy) if a compliance review or a data-residency
 * customer requires it. Never send user PII beyond the ping + public dataset snippets,
 * and never log API keys or raw query/dataset content.
 * ─────────────────────────────────────────────────────────────────────────────────
 */

// ── Typed errors so the chain can distinguish "provider unavailable" (fall through
//    quietly) from "we sent a bad request" (fall through, but log loudly so a code
//    bug isn't masked by failover) from a rate limit.
export class ProviderUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProviderUnavailableError';
  }
}
export class ProviderRateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProviderRateLimitError';
  }
}
export class ProviderBadRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProviderBadRequestError';
  }
}

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

function trimDetail(detail) {
  return String(detail || '').slice(0, 200);
}

async function readBody(res) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

/**
 * Classify a non-2xx response into a typed error. A 429 is a rate limit; 5xx / 401 /
 * 403 and a 400 whose body signals a credit/quota/billing problem are "unavailable"
 * (fall through to the next provider). A plain 400 is a bad request — still falls
 * through, but the chain logs it loudly because it may be our own malformed request.
 */
/** Best-effort parse of a provider error body ({"error":{"type","message"}}). */
function parseErrorBody(detail) {
  try {
    const j = JSON.parse(detail);
    return {
      type: j?.error?.type || j?.type || null,
      message: j?.error?.message || j?.message || null,
    };
  } catch {
    return { type: null, message: null };
  }
}

function classifyProviderError(id, status, detail) {
  const d = String(detail || '').toLowerCase();
  const parsed = parseErrorBody(detail);
  const label = parsed.type ? ` ${parsed.type}` : '';
  const unavailable =
    /credit balance|balance is too low|insufficient|out of quota|quota|billing|payment|expired|not enabled|suspend|deactiv/.test(
      d,
    );
  const attach = (err) => {
    err.provider = id;
    err.status = status;
    err.errorType = parsed.type;
    err.errorMessage = parsed.message ? String(parsed.message).slice(0, 200) : trimDetail(detail);
    return err;
  };
  if (status === 429)
    return attach(new ProviderRateLimitError(`${id} 429${label}: ${trimDetail(detail)}`));
  if (status >= 500)
    return attach(new ProviderUnavailableError(`${id} ${status}${label}: ${trimDetail(detail)}`));
  // Billing/credit exhaustion is a GENUINE availability failure even though the
  // API reports it as a 400: the fallback chain exists precisely for it.
  if (status === 400 && unavailable)
    return attach(
      new ProviderUnavailableError(`${id} 400 (credit/quota)${label}: ${trimDetail(detail)}`),
    );
  // Everything else in the 4xx range is a CONFIG error on our side (malformed
  // request, bad/revoked key, unknown model). These must halt the chain and
  // surface as fix-me items, not be masked by failover.
  if (status >= 400 && status < 500)
    return attach(new ProviderBadRequestError(`${id} ${status}${label}: ${trimDetail(detail)}`));
  return attach(new ProviderUnavailableError(`${id} ${status}${label}: ${trimDetail(detail)}`));
}

function callAnthropic(body, apiKey) {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
}

/**
 * Parse Anthropic Messages content blocks. With web search the response interleaves
 * `text` (may carry web citations), `server_tool_use`, and `web_search_tool_result`.
 * Concatenate all text, detect whether web ran, and collect distinct web sources.
 */
export function parseAnthropicContent(content) {
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

/**
 * Anthropic provider — the primary. Keeps the existing fail-safe behavior: web search
 * is additive (env-gated) and retries WITHOUT the tool on a tool-related 400; a
 * deep-tier model that 400s retries once on Haiku. Only a genuinely non-recoverable
 * response (credit/rate/outage/bad-request) throws a typed error for the chain.
 */
async function anthropicSynthesize({ system, user, maxTokens, model, fallbackModel, webSearch }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new ProviderUnavailableError('anthropic: no ANTHROPIC_API_KEY');
  const safeFallback = fallbackModel || HAIKU_MODEL;

  const baseBody = {
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  };

  // Web search is ADDITIVE, never a hard dependency: only when the plan entitles it
  // AND SONAR_WEB_SEARCH=true for this deployment. NOTE (SOC 2 / Law 25): the ping
  // text is sent to Anthropic's web search — do not pass user PII beyond it.
  const webOn = Boolean(webSearch?.enabled) && process.env.SONAR_WEB_SEARCH === 'true';
  const maxUses = Math.max(1, Number(webSearch?.maxUses) || 3);

  let res;
  if (webOn) {
    const withTool = {
      ...baseBody,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: maxUses }],
    };
    res = await callAnthropic(withTool, apiKey);
    if (res.status === 400) {
      const detail = await readBody(res);
      console.warn('[sonar] web_search 400 — retrying without tool', { model, detail });
      res = await callAnthropic(baseBody, apiKey);
    }
  } else {
    res = await callAnthropic(baseBody, apiKey);
  }

  // A deep-tier model the account can't access 400s — retry once on the safe Haiku.
  if (res.status === 400 && model !== safeFallback) {
    const detail = await readBody(res);
    console.warn('[sonar] model 400 — retrying on Haiku', { model, detail });
    res = await callAnthropic({ ...baseBody, model: safeFallback }, apiKey);
  }

  if (!res.ok) {
    const detail = await readBody(res);
    console.error('[sonar] anthropic synthesis error', { model, status: res.status, detail });
    throw classifyProviderError('anthropic', res.status, detail);
  }

  const data = await res.json();
  // Spend visibility: token usage per ping to the server console, so the
  // credit burn is auditable from the deployment logs.
  if (data?.usage) {
    console.log('[sonar] anthropic usage', {
      model: data?.model,
      input_tokens: data.usage.input_tokens,
      output_tokens: data.usage.output_tokens,
      web_search_requests: data.usage.server_tool_use?.web_search_requests,
    });
  }
  const parsed = parseAnthropicContent(data?.content);
  if (!parsed.answer) throw new ProviderUnavailableError('anthropic: empty reply');
  return parsed;
}

/**
 * OpenAI-compatible provider factory (Kimi/Moonshot, DeepSeek). These are chat/
 * completions endpoints with NO web search tool — they synthesize over the provided
 * dataset context only, using the SAME grounded/cited system prompt. Datasets are the
 * moat; web is an Anthropic-only bonus.
 */
function openaiCompatSynthesize({ id, baseURL, apiKey, model }) {
  return async ({ system, user, maxTokens }) => {
    const key = apiKey();
    if (!key) throw new ProviderUnavailableError(`${id}: no API key`);
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: model(),
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) {
      const detail = await readBody(res);
      throw classifyProviderError(id, res.status, detail);
    }
    const data = await res.json();
    const answer = (data?.choices?.[0]?.message?.content || '').trim();
    if (!answer) throw new ProviderUnavailableError(`${id}: empty reply`);
    // No web search on these providers — dataset-grounded synthesis only.
    return { answer, webUsed: false, webSources: [] };
  };
}

// The chain, in priority order. `enabled()` reads env lazily so toggles take effect
// without a rebuild. Verify Kimi/DeepSeek model ids against each provider's docs —
// they change; override via MOONSHOT_MODEL / DEEPSEEK_MODEL without a code change.
const PROVIDERS = [
  {
    id: 'anthropic',
    enabled: () => !!process.env.ANTHROPIC_API_KEY,
    call: anthropicSynthesize,
    supportsWebSearch: true,
  },
  {
    id: 'kimi',
    enabled: () => process.env.SONAR_FALLBACK_KIMI === 'true' && !!process.env.MOONSHOT_API_KEY,
    call: openaiCompatSynthesize({
      id: 'kimi',
      baseURL: 'https://api.moonshot.ai/v1',
      apiKey: () => process.env.MOONSHOT_API_KEY,
      model: () => process.env.MOONSHOT_MODEL || 'kimi-k2-0711-preview',
    }),
    supportsWebSearch: false,
  },
  {
    id: 'deepseek',
    enabled: () => process.env.SONAR_FALLBACK_DEEPSEEK === 'true' && !!process.env.DEEPSEEK_API_KEY,
    call: openaiCompatSynthesize({
      id: 'deepseek',
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: () => process.env.DEEPSEEK_API_KEY,
      model: () => process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    }),
    supportsWebSearch: false,
  },
];

/**
 * Try each enabled provider in order; return the first non-empty answer tagged with
 * the provider that produced it. On any provider failure, fall through to the next.
 * Returns `{ answer, webUsed, webSources, provider }` on success, or
 * `{ answer: null, degraded }` when all providers are unavailable.
 *
 * `args`: { system, user, maxTokens, model, fallbackModel, webSearch }. Anthropic uses
 * model/fallbackModel/webSearch; the OpenAI-compatible providers use their own env
 * model and ignore the web tool.
 */
export async function synthesizeWithFallback(args) {
  // Diagnosis line, once per synthesis: whether the primary's key is even
  // visible at runtime (a missing Vercel env var is the classic root cause of
  // a silent slide into "all providers unavailable"). Boolean only; the key
  // value is never logged.
  console.log('[sonar] synthesis start', {
    hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
    fallbackKimi: process.env.SONAR_FALLBACK_KIMI === 'true',
    fallbackDeepseek: process.env.SONAR_FALLBACK_DEEPSEEK === 'true',
  });
  const active = PROVIDERS.filter((p) => p.enabled());
  const providerErrors = [];
  if (!active.length) {
    console.error(
      '[sonar] no LLM provider configured (ANTHROPIC_API_KEY missing and no fallback enabled)',
    );
    return { answer: null, degraded: 'no LLM provider configured', providerErrors };
  }

  let lastErr;
  for (const provider of active) {
    try {
      const out = await provider.call(args);
      if (out?.answer) {
        // Surface which provider answered — so chronic failover to a fallback (a
        // signal Anthropic billing/limits need attention) stays visible, not masked.
        if (provider.id !== active[0].id) {
          console.warn('[sonar] answered by fallback provider', { provider: provider.id });
        }
        return { ...out, provider: provider.id };
      }
      lastErr = new Error(`${provider.id} returned empty`);
      providerErrors.push({
        provider: provider.id,
        status: null,
        type: 'empty',
        message: 'empty reply',
      });
      console.warn('[sonar] provider returned empty, trying next', { provider: provider.id });
    } catch (err) {
      lastErr = err;
      providerErrors.push({
        provider: err?.provider || provider.id,
        status: err?.status ?? null,
        type: err?.errorType || err?.name || 'error',
        message: err?.errorMessage || err?.message || String(err),
      });
      if (err instanceof ProviderBadRequestError) {
        // A 4xx config error (malformed request, bad/revoked key, unknown model)
        // is OUR bug or OUR deployment's bug. Failover cannot fix it and would
        // only mask it, so the chain STOPS here and the log says exactly what to
        // fix: provider, HTTP status, and the API's own error type/message.
        console.error('[sonar] provider config error (FIX ME, chain halted)', {
          provider: provider.id,
          status: err?.status ?? null,
          errorType: err?.errorType || null,
          errorMessage: err?.errorMessage || err?.message,
        });
        break;
      }
      // Genuine unavailability (network error, 5xx, 429, credit exhaustion):
      // fall through to the next enabled provider.
      console.warn('[sonar] provider unavailable, trying next', {
        provider: provider.id,
        status: err?.status ?? null,
        errorType: err?.errorType || null,
        errorMessage: err?.errorMessage || err?.message,
      });
      continue;
    }
  }
  console.error('[sonar] synthesis failed', {
    providers: providerErrors.map((e) => `${e.provider}:${e.status ?? 'net'}:${e.type}`).join(' '),
    lastError: lastErr?.message,
  });
  return { answer: null, degraded: 'all providers unavailable', providerErrors };
}
