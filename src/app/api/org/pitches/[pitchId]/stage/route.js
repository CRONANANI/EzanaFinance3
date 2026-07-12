import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { validateTransition } from '@/lib/org-pitch-state-machine';
import {
  getPitchContext,
  fetchPitchRaw,
  fetchPitchDetail,
  applyStageTransitionDb,
} from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, viewer, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const body = await request.json();
    const toStage = body.to_stage;
    if (!toStage) return NextResponse.json({ error: 'to_stage required' }, { status: 400 });

    // Gate context: deliverable count + kinds for the model+memo gate.
    const { data: dels } = await supabase
      .from('org_pitch_deliverables')
      .select('kind')
      .eq('pitch_id', pitch.id);
    const { count: voteCount } = await supabase
      .from('org_pitch_votes')
      .select('id', { count: 'exact', head: true })
      .eq('pitch_id', pitch.id);

    const validation = validateTransition(pitch, toStage, {
      viewer,
      deliverableCount: (dels || []).length,
      deliverableKinds: (dels || []).map((d) => d.kind),
      note: body.note,
      committee_meeting_at: body.committee_meeting_at,
      voteCount: voteCount || 0,
    });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error, gate: validation.gate }, { status: 400 });
    }

    const targetStage = toStage === 'rejected' ? 'decision' : toStage;
    const result = await applyStageTransitionDb(supabase, orgId, pitch, targetStage, {
      actorId: viewer.id,
      note: body.note,
      research_due_at: body.research_due_at,
      committee_meeting_at: body.committee_meeting_at,
      position_size_pct: body.position_size_pct,
      monitor_member_id: body.monitor_member_id,
      terminalStatus:
        validation.terminalStatus || (toStage === 'rejected' ? 'rejected' : undefined),
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    const detail = await fetchPitchDetail(supabase, orgId, pitch.id);
    return NextResponse.json({ pitch: detail });
  },
  { requireAuth: true },
);
