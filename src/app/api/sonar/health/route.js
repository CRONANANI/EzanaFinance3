import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Mirrors HAIKU_MODEL in src/lib/sonar/llm-providers.js — the health check must
// ping the same model the real synthesis chain falls back to, or a model-access
// failure would pass here and still break synthesis.
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

/**
 * GET /api/sonar/health — admin-only synthesis chain health check.
 *
 * Reports whether ANTHROPIC_API_KEY is visible to this deployment, then makes
 * a minimal (1 output token, Haiku, no tools) live call and returns its
 * status and error type. Turns "Synthesis is unavailable right now" from a
 * log-spelunking exercise into one URL:
 *   ok: true                          -> key + credits + model all good
 *   401 authentication_error          -> key value wrong (re-paste it)
 *   400 + credit/billing message      -> credits are on a different Anthropic
 *                                        organization than this key's org
 *   529 / 5xx                         -> Anthropic outage (transient)
 *   keyPresent: false                 -> env var not in this deployment
 *                                        (redeploy; check Production scope)
 * Never logs or returns the key. Costs a fraction of a cent per call.
 */
export const GET = withApiGuard(
  async () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const base = {
      keyPresent: Boolean(apiKey),
      webSearchEnabled: process.env.SONAR_WEB_SEARCH === 'true',
      fallbackKimi: process.env.SONAR_FALLBACK_KIMI === 'true',
      fallbackDeepseek: process.env.SONAR_FALLBACK_DEEPSEEK === 'true',
      model: HAIKU_MODEL,
      checkedAt: new Date().toISOString(),
    };
    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        ...base,
        diagnosis:
          'ANTHROPIC_API_KEY is not visible to this deployment. Add it for the Production environment and redeploy (env vars only attach to new deployments).',
      });
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: HAIKU_MODEL,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        return NextResponse.json({
          ok: true,
          ...base,
          status: res.status,
          usage: data?.usage || null,
          diagnosis: 'Anthropic key, organization credits, and model access all confirmed working.',
        });
      }

      const detail = await res.text().catch(() => '');
      let errorType = null;
      let errorMessage = null;
      try {
        const j = JSON.parse(detail);
        errorType = j?.error?.type || null;
        errorMessage = j?.error?.message ? String(j.error.message).slice(0, 300) : null;
      } catch {
        errorMessage = detail.slice(0, 300);
      }
      const lower = (errorMessage || '').toLowerCase();
      let diagnosis = 'Anthropic returned an error; see errorType and errorMessage.';
      if (res.status === 401) {
        diagnosis =
          'Authentication failed: the key value is wrong. Re-paste ANTHROPIC_API_KEY (watch for quotes or whitespace) and redeploy.';
      } else if (res.status === 400 && /credit|balance|billing/.test(lower)) {
        diagnosis =
          "The key works but its organization has no credits. Anthropic credits are per organization: verify in console.anthropic.com that THIS key's org shows your purchased balance.";
      } else if (res.status === 404 || (res.status === 400 && /model/.test(lower))) {
        diagnosis =
          'Model not available to this account; check model access in the Anthropic console.';
      } else if (res.status === 429) {
        diagnosis = 'Rate limited; transient. Retry shortly.';
      } else if (res.status >= 500) {
        diagnosis = 'Anthropic outage; transient. Retry shortly.';
      }
      return NextResponse.json({
        ok: false,
        ...base,
        status: res.status,
        errorType,
        errorMessage,
        diagnosis,
      });
    } catch (e) {
      const timedOut = e?.name === 'TimeoutError' || e?.name === 'AbortError';
      return NextResponse.json({
        ok: false,
        ...base,
        status: null,
        errorType: timedOut ? 'timeout' : 'network',
        errorMessage: String(e?.message || e).slice(0, 300),
        diagnosis: timedOut
          ? 'The call to api.anthropic.com timed out (15s); transient or egress issue.'
          : 'Network error reaching api.anthropic.com from this deployment.',
      });
    }
  },
  { requiredRole: 'admin', strict: true },
);
