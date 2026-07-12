import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { hasPitchPermission } from '@/lib/org-pitches';
import {
  getPitchContext,
  fetchPitchRaw,
  fetchPitchDetail,
  recordDecisionDb,
} from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, viewer, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    if (!hasPitchPermission(viewer, 'pitch.final_decision')) {
      return NextResponse.json({ error: 'Executives only' }, { status: 403 });
    }

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
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

    const result = await recordDecisionDb(supabase, orgId, pitch, {
      decision: body.decision,
      decision_rationale: body.decision_rationale,
      position_size_pct: body.position_size_pct,
      monitor_member_id: body.monitor_member_id,
      actorId: viewer.id,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    const detail = await fetchPitchDetail(supabase, orgId, pitch.id);
    return NextResponse.json({ pitch: detail });
  },
  { requireAuth: true },
);
