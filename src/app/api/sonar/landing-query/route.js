import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getAdminClient, getAuthUser } from '@/lib/supabase';
import { runLandingPipeline, hashIp, DISCLAIMER } from '@/lib/sonar/landing-pipeline';
import { reservePing, completePing, failPing } from '@/lib/sonar/quota';
import { getClientIp } from '@/lib/client-ip';
import { withTimeout } from '@/lib/with-timeout';

/**
 * POST /api/sonar/landing-query. The landing page's guest Sonar.
 *
 * Anonymous visitors get GUEST_LIMIT real pings per browser session per
 * device. The pipeline itself lives in @/lib/sonar/landing-pipeline, shared
 * with the cached demo route so the two cannot drift; this route owns only
 * the things a guest ping needs and the demo does not: quota, the signed
 * cookie, and the ledger row.
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
 *
 * Quota accounting: a ping is only spent when the visitor actually got an
 * answer. A failed synthesis or a dead upstream returns the count untouched
 * and leaves the cookie alone, so nobody burns their five on our outage. A
 * general-knowledge answer still counts, because a real synthesis was paid for.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/* Oct 26: 60s was the whole budget AND the hard kill, so any slow leg turned
   into a platform 504 with no body ("That ping did not land" on the landing
   band and on /datasets). The pipeline now runs to its own deadline
   (PIPELINE_BUDGET_MS from the handler's start, every leg bounded) and the
   function cap sits above it, so the route always gets to answer. */
export const maxDuration = 90;
const PIPELINE_BUDGET_MS = 70_000;
const AUTH_MS = 3_000;
const RESERVE_MS = 6_000;

const GUEST_LIMIT = 5;
const COOKIE = 'snr_guest';

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

const FORCE_KINDS = new Set(['ticker', 'country', 'industry', 'sector', 'state_province', 'theme']);

export const POST = withApiGuard(
  async (request) => {
    const startedAt = Date.now();
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

    /* A signed-in visitor (the Datasets search page reuses this pipeline) is
       not a guest: no 5-ping cookie cap and no sign-up gate. Their pings are
       capped per account per day instead, counted from the ledger. */
    /* Bounded: a stalled session lookup reads as a guest ping (the cookie cap
       still applies) instead of hanging the request. */
    const memberRes = await withTimeout(getAuthUser(request), AUTH_MS, 'auth');
    const member = memberRes.ok ? memberRes.value || null : null;
    if (memberRes.timedOut) console.warn('[sonar/landing] auth lookup timed out');
    const memberCap = Math.max(1, Number(process.env.SONAR_MEMBER_DAILY_CAP) || 25);

    // Guest quota gate, before any retrieval or model spend.
    const used = member ? 0 : readGuestCount(request);
    if (used >= GUEST_LIMIT) {
      return NextResponse.json({
        gate: true,
        remaining: 0,
        message: 'You have used your 5 free pings. Create a free account to keep going.',
        disclaimer: DISCLAIMER,
      });
    }

    const admin = getAdminClient();

    /* Reserve the ping before any retrieval or model spend: the member's
       daily cap (or, for a guest, a per-IP-hash cap behind the cookie) and
       the shared global cap are counted and a 'reserved' ledger row inserted
       under one lock, so parallel pings cannot all pass the same count.
       Salted IP hash only, never a raw IP. */
    const ipHash = hashIp(getClientIp(request) || 'unknown', guestSecret());
    const reservationP = reservePing(admin, {
      userId: member?.id || null,
      limit: member ? memberCap : null,
      ipHash: member ? null : ipHash,
      ipLimit: member
        ? null
        : Math.max(GUEST_LIMIT, Number(process.env.SONAR_GUEST_IP_DAILY_CAP) || 20),
      isGuest: !member,
      query,
      version: member ? 'member' : 'guest',
      planTier: 0,
    });
    const reservationRes = await withTimeout(reservationP, RESERVE_MS, 'reserve');
    /* A reservation that cannot be made in time is our outage, not the
       visitor's quota: a clear 503 they can retry. If the insert lands after
       we gave up, it is released the moment it does, so the late row never
       counts against the visitor. */
    if (!reservationRes.ok) {
      reservationP.then((late) => (late?.ok ? failPing(admin, late) : null)).catch(() => {});
    }
    const reservation = reservationRes.ok ? reservationRes.value : { ok: false, reason: 'error' };
    if (!reservationRes.ok) console.warn('[sonar/landing] reservePing timed out or threw');
    if (!reservation.ok) {
      return NextResponse.json(
        {
          error:
            reservation.reason === 'quota'
              ? 'You have used today\u2019s pings. They reset at midnight UTC.'
              : 'That ping did not land. Try again in a moment.',
        },
        { status: reservation.reason === 'error' ? 503 : 429 },
      );
    }

    /* "Search instead for" re-pings with noCorrect; an ambiguity chip
       re-pings with one forced entity. Both are validated, never trusted. */
    const noCorrect = body?.noCorrect === true;
    const f = body?.force;
    const force =
      f &&
      FORCE_KINDS.has(f.kind) &&
      typeof f.id === 'string' &&
      f.id.length <= 60 &&
      (f.surface == null || (typeof f.surface === 'string' && f.surface.length <= 60))
        ? {
            kind: f.kind,
            id: f.id,
            label: typeof f.label === 'string' ? f.label.slice(0, 80) : f.id,
            surface: f.surface || null,
          }
        : null;

    let result;
    try {
      result = await runLandingPipeline(query, {
        admin,
        noCorrect,
        force,
        deadlineAt: startedAt + PIPELINE_BUDGET_MS,
      });
    } catch (e) {
      await failPing(admin, reservation);
      return safeErrorResponse(e);
    }

    console.log('[sonar/landing]', {
      query,
      resolved: result.resolved?.ticker || null,
      items: result.itemCount,
      grounded: result.grounded,
      corporaUsed: result.corporaUsed,
    });

    /* No answer at all means both the grounded and the general synthesis
       failed, which is our problem and not the visitor's. Nothing is spent. */
    if (!result.answer) {
      await failPing(admin, reservation);
      return NextResponse.json(
        {
          answer: null,
          grounded: false,
          sources: result.sources,
          remaining: GUEST_LIMIT - used,
          disclaimer: DISCLAIMER,
          error: 'That ping did not land. Try again.',
          ...(process.env.NODE_ENV !== 'production' && result.providerErrors.length
            ? { debug: result.providerErrors }
            : {}),
        },
        { status: 502 },
      );
    }

    /* Complete the reserved ledger row. Non-fatal by design: the row is
       already counted, and failing here would show the visitor an error for
       a working ping whose synthesis we have already paid for. */
    try {
      await completePing(admin, reservation, {
        classification: result.classification,
        datasets_searched: result.sources.map((s) => s.id),
        grounded: result.grounded,
      });
    } catch (e) {
      console.error('[sonar/landing] ledger complete threw:', e?.message);
    }

    const nextUsed = used + 1;
    const res = NextResponse.json({
      answer: result.answer,
      grounded: result.grounded,
      sources: result.sources,
      relevance: result.relevance,
      dossier: result.dossier,
      webUsed: result.webUsed,
      webSources: result.webSources,
      newsColumns: result.newsColumns,
      intent: result.intent,
      sanctions: result.sanctions,
      understood: result.understood,
      remaining: member ? null : Math.max(0, GUEST_LIMIT - nextUsed),
      disclaimer: DISCLAIMER,
    });
    if (!member) setGuestCount(res, nextUsed);
    return res;
  },
  { requireAuth: false, strict: true },
);
