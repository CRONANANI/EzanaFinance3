import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { runLandingPipeline, hashIp, DISCLAIMER } from '@/lib/sonar/landing-pipeline';

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
export const maxDuration = 30;

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

    let result;
    try {
      result = await runLandingPipeline(query, { admin });
    } catch (e) {
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

    /* Ledger row: quota accounting for the global cap plus audit. Salted IP
       hash only, never a raw IP. Non-fatal by design: failing here would
       waste synthesis we have already paid for and show the visitor an error
       for a working ping. */
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    try {
      const { error: ledgerError } = await admin.from('sonar_queries').insert({
        user_id: null,
        is_guest: true,
        ip_hash: hashIp(ip, guestSecret()),
        query_text: query,
        classification: result.classification,
        version: 'guest',
        plan_tier: 0,
        datasets_searched: result.sources.map((s) => s.id),
        grounded: result.grounded,
      });
      if (ledgerError) {
        console.error(
          '[sonar/landing] ledger insert failed (apply supabase/migrations/20260920120000_sonar_guest_queries.sql):',
          ledgerError.message,
        );
      }
    } catch (e) {
      /* The destructured error above covers Postgres-level failures, which are
         returned rather than thrown. A transport failure still throws, and
         letting it escape would 500 a ping whose synthesis we have already
         paid for. Loud log, response proceeds. */
      console.error('[sonar/landing] ledger insert threw:', e?.message);
    }

    const nextUsed = used + 1;
    const res = NextResponse.json({
      answer: result.answer,
      grounded: result.grounded,
      sources: result.sources,
      relevance: result.relevance,
      dossier: result.dossier,
      remaining: Math.max(0, GUEST_LIMIT - nextUsed),
      disclaimer: DISCLAIMER,
    });
    setGuestCount(res, nextUsed);
    return res;
  },
  { requireAuth: false, strict: true },
);
