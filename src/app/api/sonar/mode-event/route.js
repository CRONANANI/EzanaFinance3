import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, getAuthUser } from '@/lib/supabase';
import { getClientIp } from '@/lib/client-ip';
import { withTimeout } from '@/lib/with-timeout';
import { hashIp } from '@/lib/sonar/landing-pipeline';
import { guestSecret } from '@/lib/sonar/guest-cookie';
import { CLIENT_ACTIONS, logModeEvent } from '@/lib/sonar/mode-events';
import { SONAR_QUERY_MAX } from '@/lib/sonar/limits';

/**
 * POST /api/sonar/mode-event (Nov 2026, research modes). The client's half of
 * the research-mode labels: a deep offer shown, accepted or declined, and Go
 * deeper shown or clicked. Body: { query, action, predictedMode, confidence,
 * score, triggers, ranMode, details }.
 *
 * Rate limited (withApiGuard). Written through the admin client to
 * sonar_mode_events; guests by salted IP hash, never a raw IP. Only the
 * client actions are accepted here (the server logs 'classified',
 * 'signup_gate' and 'deep_quota' itself). Always answers quickly: a failed
 * write is not the visitor's problem.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApiGuard(
  async (request) => {
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '');
    if (!CLIENT_ACTIONS.has(action)) {
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
    const query = String(body?.query || '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, SONAR_QUERY_MAX);
    if (!query) return NextResponse.json({ error: 'Missing query.' }, { status: 400 });

    const auth = await withTimeout(getAuthUser(request), 700, 'auth');
    const user = auth.ok ? auth.value || null : null;
    const details =
      body?.details && typeof body.details === 'object' && !Array.isArray(body.details)
        ? JSON.parse(JSON.stringify(body.details).slice(0, 2000) || '{}')
        : {};
    const stored = await withTimeout(
      logModeEvent(getAdminClient(), {
        query,
        action,
        predictedMode: body?.predictedMode,
        confidence: body?.confidence,
        score: body?.score,
        triggers: body?.triggers,
        ranMode: body?.ranMode,
        details,
        userId: user?.id || null,
        ipHash: user ? null : hashIp(getClientIp(request) || 'unknown', guestSecret()),
      }),
      800,
      'mode-event',
    );
    return NextResponse.json({ ok: Boolean(stored.ok && stored.value) });
  },
  { requireAuth: false },
);
