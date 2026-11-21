import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, getCurrentUser } from '@/lib/supabase';
import { CLIENT_FUNNEL_EVENTS, logFunnelEvent } from '@/lib/analytics/funnel';

/**
 * POST /api/funnel-event (Nov 21, 2026)  { event, plan?, billing?, goal?, anonId? }
 *
 * Records one pricing or onboarding funnel step. Rate limited (withApiGuard),
 * signed-in or not. Only enumerated fields are kept (cleanFunnelFields); no
 * free text is stored. Always answers 204 quickly.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = withApiGuard(
  async (request) => {
    const body = await request.json().catch(() => ({}));
    const event = String(body?.event || '');
    if (!CLIENT_FUNNEL_EVENTS.has(event)) {
      return NextResponse.json({ error: 'Unknown event.' }, { status: 400 });
    }
    const user = await getCurrentUser(request).catch(() => null);
    await logFunnelEvent(
      getAdminClient(),
      event,
      { plan: body.plan, billing: body.billing, goal: body.goal },
      { userId: user?.id || null, anonId: typeof body.anonId === 'string' ? body.anonId : null },
    );
    return new NextResponse(null, { status: 204 });
  },
  { requireAuth: false },
);
