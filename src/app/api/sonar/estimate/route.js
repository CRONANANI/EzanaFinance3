import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { getClientIp } from '@/lib/client-ip';
import { withTimeout } from '@/lib/with-timeout';
import { hashIp } from '@/lib/sonar/landing-pipeline';
import { GUEST_LIMIT, guestSecret, readGuestCount } from '@/lib/sonar/guest-cookie';
import { resolveResearchAccess } from '@/lib/sonar/engine/access';
import { deepResearchEnabled, deepResearchForGuests } from '@/lib/sonar/deep-research';
import { classifyResearchMode } from '@/lib/sonar/research-mode';
import { SONAR_QUERY_MAX } from '@/lib/sonar/limits';
import { buildEstimate, cleanSonarQuery, landingRunMode } from '@/lib/sonar/estimate';
import { readRecentDurations, readUsage } from '@/lib/sonar/estimate-server';
import { withNoEmDash } from '@/lib/text/no-em-dash-response';

/**
 * POST /api/sonar/estimate { query }. How long the answer to a question will
 * take, and what deep research would take and use, before anything runs
 * (Nov 2026). No model call, no reservation, no charge: the classifier is
 * pure, the times are p50/p90 of the ledger's duration_ms (or the plan
 * until there are 30 samples), and the usage numbers are read from the same
 * ledger and entitlements the reservation uses (lib/sonar/estimate.js,
 * lib/sonar/estimate-server.js).
 *
 * The browser fires it on submit, just before the ping, and never waits on
 * it for the ping. Same input contract as /api/sonar/landing-query (2 to
 * 600 characters, control characters stripped); the light rate limit is
 * withApiGuard's default bucket.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACCESS_MS = 2_500;
const DURATIONS_MS = 1_200;

/* Bounded: a slow read means no samples, so the plan estimate is used. */
const durations = (admin, mode) =>
  withTimeout(readRecentDurations(admin, mode), DURATIONS_MS, 'est-durations').then((r) =>
    r.ok ? r.value : [],
  );

const POST_HANDLER = withApiGuard(
  async (request) => {
    const body = await request.json().catch(() => ({}));
    const query = cleanSonarQuery(body?.query);
    if (query.length < 2) {
      return NextResponse.json({ error: 'Type something to ping.' }, { status: 400 });
    }
    if (query.length > SONAR_QUERY_MAX) {
      return NextResponse.json(
        { error: `Keep pings under ${SONAR_QUERY_MAX} characters.` },
        { status: 400 },
      );
    }

    let classification = null;
    try {
      classification = classifyResearchMode(query);
    } catch {
      classification = null;
    }

    const admin = getAdminClient();
    const ipHash = hashIp(getClientIp(request) || 'unknown', guestSecret());
    const [accessRes, answerMs, deepMs] = await Promise.all([
      withTimeout(resolveResearchAccess(request, admin), ACCESS_MS, 'est-access'),
      durations(admin, landingRunMode(classification)),
      durations(admin, 'deep'),
    ]);
    /* An identity that cannot be resolved in time reads as a guest: the card
       then offers sign-up, and the research route decides for real. */
    const access = accessRes.ok ? accessRes.value : { user: null, entitlements: null, scope: {} };
    const usage = await readUsage(admin, {
      access,
      ipHash,
      guestCount: access.user ? 0 : readGuestCount(request),
      guestLimit: GUEST_LIMIT,
      guestNeedsAccount: !deepResearchForGuests(),
    });

    return NextResponse.json(
      buildEstimate({
        classification,
        answerDurationsMs: answerMs,
        deepDurationsMs: deepMs,
        usage,
        deepEnabled: deepResearchEnabled(),
      }),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  },
  /* Light: the default (non-strict) per-IP or per-user bucket, and a short
     wait on the limiter so the estimate stays fast. */
  { requireAuth: false, rateLimitTimeoutMs: 800 },
);

/* No em dashes in anything this route returns (src/lib/text/em-dash.js). */
export const POST = withNoEmDash(POST_HANDLER);
