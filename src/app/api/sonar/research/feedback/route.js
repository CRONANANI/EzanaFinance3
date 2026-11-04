import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, getAuthUser } from '@/lib/supabase';
import { getClientIp } from '@/lib/client-ip';
import { hashIp } from '@/lib/sonar/landing-pipeline';
import { guestSecret } from '@/lib/sonar/guest-cookie';
import { cleanFeedback } from '@/lib/sonar/engine/telemetry';

/**
 * POST /api/sonar/research/feedback { runId, kind, findingId?, evidenceId?, note? }.
 * Feedback on a research run or one finding. Stored as 'pending_review':
 * a signal for investigation, never a direct change to retrieval or models
 * (recalibrate.js reads only reviewed, 'accepted' rows). One row per caller
 * per run, finding and kind (a unique index), so repeated clicks cannot
 * stack a signal. Strict rate limit. Salted IP hash only.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApiGuard(
  async (request) => {
    const body = await request.json().catch(() => ({}));
    const clean = cleanFeedback(body);
    if (clean.error) return NextResponse.json({ error: clean.error }, { status: 400 });
    const admin = getAdminClient();
    const { data: run } = await admin
      .from('sonar_research_runs')
      .select('id')
      .eq('id', clean.row.run_id)
      .maybeSingle();
    if (!run) return NextResponse.json({ error: 'Unknown research run.' }, { status: 404 });
    const user = await getAuthUser(request).catch(() => null);
    const row = {
      ...clean.row,
      user_id: user?.id || null,
      ip_hash: user ? null : hashIp(getClientIp(request) || 'unknown', guestSecret()),
      status: 'pending_review',
    };
    const { error } = await admin
      .from('sonar_research_feedback')
      .upsert(row, { onConflict: 'run_id,finding_key,kind,caller_key', ignoreDuplicates: true });
    if (error)
      return NextResponse.json({ error: 'Feedback was not saved. Try again.' }, { status: 503 });
    return NextResponse.json({ ok: true });
  },
  { requireAuth: false, strict: true },
);
