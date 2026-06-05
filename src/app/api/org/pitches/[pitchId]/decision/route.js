import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { recordDecision, getPitchRaw } from '@/lib/org-pitch-store';
import { getPitchById, hasPitchPermission } from '@/lib/org-pitches';
import { getPitchApiContext } from '@/lib/org-pitch-api-helpers';
import { notifyStageChange } from '@/lib/org-pitch-notifications';

export const dynamic = 'force-dynamic';

export const POST = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, viewer, orgId } = await getPitchApiContext();
    if (!hasPitchPermission(viewer, 'pitch.final_decision')) {
      return NextResponse.json({ error: 'Executives only' }, { status: 403 });
    }

    const pitch = getPitchRaw(params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    if (!['committee_vote', 'decision'].includes(pitch.stage)) {
      return NextResponse.json({ error: 'Pitch not ready for final decision' }, { status: 400 });
    }

    const body = await request.json();
    if (!['accepted', 'rejected', 'watchlist', 'deferred'].includes(body.decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }
    if (!body.decision_rationale?.trim()) {
      return NextResponse.json({ error: 'decision_rationale required' }, { status: 400 });
    }

    const updated = recordDecision(pitch.id, {
      decision: body.decision,
      decision_rationale: body.decision_rationale,
      position_size_pct: body.position_size_pct,
      monitor_member_id: body.monitor_member_id,
      actorId: viewer.id,
    });

    await notifyStageChange(supabase, orgId, pitch.id, 'decision', viewer.id);

    return NextResponse.json({ pitch: getPitchById(updated.id) });
  },
  { requireAuth: true },
);
