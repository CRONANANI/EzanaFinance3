import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import {
  getPitchRaw,
  getDeliverablesForPitch,
  getVotesForPitch,
  applyStageTransition,
} from '@/lib/org-pitch-store';
import { validateTransition } from '@/lib/org-pitch-state-machine';
import { getPitchById } from '@/lib/org-pitches';
import { getPitchApiContext } from '@/lib/org-pitch-api-helpers';
import { notifyStageChange } from '@/lib/org-pitch-notifications';

export const dynamic = 'force-dynamic';

export const POST = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, viewer, orgId } = await getPitchApiContext();
    const pitch = getPitchRaw(params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const body = await request.json();
    const toStage = body.to_stage;
    if (!toStage) return NextResponse.json({ error: 'to_stage required' }, { status: 400 });

    const validation = validateTransition(pitch, toStage, {
      viewer,
      deliverableCount: getDeliverablesForPitch(pitch.id).length,
      note: body.note,
      committee_meeting_at: body.committee_meeting_at,
      voteCount: getVotesForPitch(pitch.id).length,
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const targetStage = toStage === 'rejected' ? 'decision' : toStage;
    const updated = applyStageTransition(pitch, targetStage, {
      actorId: viewer.id,
      note: body.note,
      research_due_at: body.research_due_at,
      committee_meeting_at: body.committee_meeting_at,
      terminalStatus:
        validation.terminalStatus || (toStage === 'rejected' ? 'rejected' : undefined),
    });

    await notifyStageChange(supabase, orgId, pitch.id, updated.stage, viewer.id);
    if (validation.terminalStatus) {
      await notifyStageChange(supabase, orgId, pitch.id, 'decision', viewer.id);
    }

    return NextResponse.json({ pitch: getPitchById(updated.id) });
  },
  { requireAuth: true },
);
