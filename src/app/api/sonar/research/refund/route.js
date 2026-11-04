import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { verifyRefund, guestCookieHeader } from '@/lib/sonar/guest-cookie';

/**
 * POST /api/sonar/research/refund { runId, token }. Puts a guest's ping back
 * after a research run that failed. The token is HMAC-signed for this run and
 * count, and the run must be recorded as failed (or not recorded at all,
 * when telemetry itself could not be written): a completed run cannot be
 * refunded.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApiGuard(
  async (request) => {
    const body = await request.json().catch(() => ({}));
    const runId = String(body?.runId || '');
    if (!/^[0-9a-f-]{36}$/i.test(runId)) return NextResponse.json({ ok: false }, { status: 400 });
    const count = verifyRefund(runId, body?.token);
    if (count == null) return NextResponse.json({ ok: false }, { status: 400 });
    const { data } = await getAdminClient()
      .from('sonar_research_runs')
      .select('status')
      .eq('id', runId)
      .maybeSingle();
    if (data && data.status !== 'failed') return NextResponse.json({ ok: false }, { status: 409 });
    const res = NextResponse.json({ ok: true });
    res.headers.set('Set-Cookie', guestCookieHeader(count));
    return res;
  },
  { requireAuth: false, strict: true },
);
