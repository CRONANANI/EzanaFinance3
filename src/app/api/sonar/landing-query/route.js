import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { getSonarEntitlements, SONAR_DATASETS } from '@/lib/sonar/entitlements';
import {
  corporaForDatasets,
  depthBudget,
  classifyQuery,
  CORPUS_TO_DATASET,
} from '@/lib/sonar/retrieval';
import { orchestrate } from '@/lib/research-copilot/orchestrate';
import { synthesizeWithFallback } from '@/lib/sonar/llm-providers';

/**
 * POST /api/sonar/landing-query. The landing page's guest Sonar.
 *
 * Anonymous visitors get GUEST_LIMIT real pings per browser session per
 * device, then the client shows the auth gate. Each ping is the free-tier
 * pipeline: free entitlements from the same matrix as the app, retrieval over
 * the entitled corpora only, Haiku-only synthesis with a small token budget
 * and no web tool. Spend rides the existing ANTHROPIC_API_KEY and counts
 * against SONAR_GLOBAL_DAILY_CAP via the shared sonar_queries ledger.
 *
 * Four independent guards, all server-side, because this is an unauthenticated
 * endpoint that spends money:
 *   1. withApiGuard(strict) rate limits 10/min/IP.
 *   2. An HMAC-signed httpOnly session cookie caps a visitor at GUEST_LIMIT.
 *   3. The shared global daily cap backstops cookie clearing.
 *   4. Input is 2-300 chars, control characters stripped, same contract as the
 *      authenticated route.
 * The quota check runs BEFORE any retrieval or model call, so an exhausted
 * visitor costs nothing.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const GUEST_LIMIT = 5;
const COOKIE = 'snr_guest';

/* Same constant the synthesis chain uses as its safe fallback
   (src/lib/sonar/llm-providers.js). Guests are pinned to it: cheapest model,
   small budget, no web tool. */
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

const DISCLAIMER =
  'Sonar synthesizes sourced research from Ezana datasets. Findings only, never financial advice.';

/* Same voice as the app's SYSTEM_PROMPT, constrained for the landing panel.
   Deliberately NOT buildUserPrompt from the authenticated route: that prompt
   instructs the model to use live web search, which a guest ping does not
   have, so sharing it would ask for citations it cannot produce. */
const GUEST_SYSTEM_PROMPT = `You are Ezana Sonar, a research/intelligence surface, answering a guest ping on the public landing page. You are given sourced snippets from Ezana's datasets (Echo editorial, congressional trades, government contracts, prediction markets). Rules:
- Ground every claim in a provided source and cite its marker inline, e.g. [S1].
- If the sources do not cover the subject, say so plainly. Never fabricate.
- Findings only. No financial or investment advice, price targets, or buy/sell/hold calls.
- Respond as EXACTLY three short paragraphs separated by blank lines: (1) one-sentence headline read plus what the subject is, (2) what the dataset signals show, (3) cross-signals or gaps worth watching. No headers, no lists.
- Plain language, no hype, no em dashes. If the ping is not a finance-adjacent entity, answer briefly and suggest a better ping.`;

function guestSecret() {
  return process.env.SONAR_GUEST_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

function sign(value) {
  return crypto.createHmac('sha256', guestSecret()).update(value).digest('base64url');
}

function readGuestCount(request) {
  const raw = request.cookies?.get?.(COOKIE)?.value || '';
  const [countStr, sig] = raw.split('.');
  if (!countStr || !sig) return 0;
  const expected = sign(countStr);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  /* Length check first: timingSafeEqual throws on a length mismatch, which a
     forged cookie could trigger deliberately. */
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return 0;
  const n = parseInt(countStr, 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, GUEST_LIMIT) : 0;
}

function setGuestCount(res, n) {
  const v = String(n);
  // Session cookie on purpose: no maxAge means it dies with the browser
  // session, which is the "per browsing session per device" contract.
  res.cookies.set(COOKIE, `${v}.${sign(v)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

function startOfUtcDayISO() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export const POST = withApiGuard(
  async (request) => {
    const body = await request.json().catch(() => ({}));
    const query = String(body?.query || '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (query.length < 2) {
      return NextResponse.json({ error: 'Type something to ping.' }, { status: 400 });
    }
    if (query.length > 300) {
      return NextResponse.json({ error: 'Keep pings under 300 characters.' }, { status: 400 });
    }

    // Guest quota gate, before any retrieval or model spend.
    const used = readGuestCount(request);
    if (used >= GUEST_LIMIT) {
      return NextResponse.json({
        gate: true,
        remaining: 0,
        message: 'You have used your 5 free pings. Create a free account to keep going.',
        disclaimer: DISCLAIMER,
      });
    }

    const admin = getAdminClient();

    // Shared global circuit breaker, guests included via the shared ledger.
    const globalCap = Math.max(0, Number(process.env.SONAR_GLOBAL_DAILY_CAP) || 500);
    const { count: globalToday } = await admin
      .from('sonar_queries')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfUtcDayISO());
    if ((globalToday || 0) >= globalCap) {
      return NextResponse.json(
        { error: 'That ping did not land. Try again in a moment.' },
        { status: 429 },
      );
    }

    // Free-tier entitlements from the same matrix as the app: honest scoping,
    // one source of truth for what a guest can see.
    const entitlements = getSonarEntitlements({ planTier: 0, version: 'regular' });
    // classifyQuery returns a plain string, not an object.
    const classification = classifyQuery(query);
    const allowCorpora = corporaForDatasets(entitlements.datasets);
    const budget = depthBudget('summary');

    let items = [];
    let corporaSearched = [];
    let corporaUsed = [];
    try {
      /* orchestrate defaults supabaseUser and member to null, and its org-member
         gate excludes org corpora when they are absent, so a guest call needs
         neither. */
      const out = await orchestrate(query, {
        admin,
        allowCorpora,
        topK: budget.topK,
        perCorpusCap: budget.perCorpusCap,
        charBudget: budget.charBudget,
      });
      items = out.items || [];
      corporaSearched = out.corporaSearched || [];
      corporaUsed = out.corporaUsed || [];
    } catch (e) {
      return safeErrorResponse(e);
    }

    const marked = items.map((it, i) => ({ ...it, marker: `S${i + 1}` }));

    let answer = null;
    if (marked.length) {
      const sourcesBlock = marked
        .map((it) => `[${it.marker}] (${it.corpus}) ${String(it.text || '').slice(0, 500)}`)
        .join('\n');
      const out = await synthesizeWithFallback({
        system: GUEST_SYSTEM_PROMPT,
        user: `Ping: ${query}\n\nSources:\n${sourcesBlock}`,
        maxTokens: 420,
        model: HAIKU_MODEL,
        fallbackModel: HAIKU_MODEL,
        webSearch: false,
      });
      answer = out.answer || null;
    }

    const usedCorpora = new Set(corporaUsed);
    const sources = corporaSearched
      .map((corpus) => {
        const id = CORPUS_TO_DATASET[corpus];
        const meta = SONAR_DATASETS[id];
        return meta ? { id, label: meta.label, used: usedCorpora.has(corpus) } : null;
      })
      .filter(Boolean);

    /* Ledger row: quota accounting for the global cap plus audit. Salted IP
       hash only, never a raw IP.

       Non-fatal by design. This row needs
       supabase/migrations/20260920120000_sonar_guest_queries.sql, which is
       applied by hand; until then user_id is still NOT NULL and this insert
       throws. Failing here would waste synthesis we have already paid for and
       show the visitor an error for a working ping, so the failure is logged
       and swallowed. The cost is the audit row and this ping's share of the
       global cap, both of which the per-IP limiter still backstops. */
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const ipHash = crypto.createHash('sha256').update(`snr:${ip}:${guestSecret()}`).digest('hex');
    const { error: ledgerError } = await admin.from('sonar_queries').insert({
      user_id: null,
      is_guest: true,
      ip_hash: ipHash,
      query_text: query,
      classification,
      version: 'guest',
      plan_tier: 0,
      datasets_searched: sources.map((s) => s.id),
      grounded: Boolean(answer),
    });
    if (ledgerError) {
      console.error(
        '[sonar/landing] ledger insert failed (apply supabase/migrations/20260920120000_sonar_guest_queries.sql):',
        ledgerError.message,
      );
    }

    const nextUsed = used + 1;
    const res = NextResponse.json({
      answer,
      grounded: Boolean(answer),
      sources,
      remaining: Math.max(0, GUEST_LIMIT - nextUsed),
      disclaimer: DISCLAIMER,
    });
    setGuestCount(res, nextUsed);
    return res;
  },
  { requireAuth: false, strict: true },
);
