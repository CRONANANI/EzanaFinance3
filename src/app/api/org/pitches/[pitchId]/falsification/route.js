import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getPitchContext, fetchPitchRaw, fetchPitchDetail } from '@/lib/org-pitch-api-helpers';
import { tripFalsification } from '@/lib/pitch/side-effects';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/org/pitches/[pitchId]/falsification
 * The in-portfolio review answers the analyst's own kill condition.
 *   { tripped: boolean, note?: string }
 * tripped=true → auto-create a Red Flag on the ticker (spec §5.3) and stamp the
 * review clock. tripped=false → just reaffirm (reset the 90d clock).
 */
export const POST = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    let flagId = null;
    if (body.tripped) {
      const res = await tripFalsification(supabase, orgId, pitch, body.note);
      if (res.error) return NextResponse.json({ error: res.error }, { status: 500 });
      flagId = res.flagId;
    }

    // Either way this is a completed review — reset the 90d review clock.
    await supabase
      .from('org_pitches')
      .update({ last_reaffirmed_at: new Date().toISOString() })
      .eq('id', pitch.id);

    const detail = await fetchPitchDetail(supabase, orgId, pitch.id);
    return NextResponse.json({ pitch: detail, tripped: !!body.tripped, flagId });
  },
  { requireAuth: true },
);
