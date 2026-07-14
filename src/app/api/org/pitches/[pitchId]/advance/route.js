import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getPitchContext, fetchPitchRaw, fetchPitchDetail } from '@/lib/org-pitch-api-helpers';
import { STAGE_CONFIG, canAdvanceStage, canOverrideStage } from '@/lib/pitch/stage-config';
import { evaluateGates, allGatesPass } from '@/lib/pitch/gates';
import { buildGateContext } from '@/lib/pitch/gate-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const OVERRIDE_MIN_CHARS = 20;

/**
 * POST /api/org/pitches/[pitchId]/advance
 * Re-computes every gate for the pitch's CURRENT stage from the DB, then moves
 * it to the configured next stage (or to 'rejected' when body.reject is set).
 * Writes an immutable org_pitch_stage_transition with the full gate snapshot.
 */
export const POST = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, viewer, orgId } = await getPitchContext();
    if (!orgId || !viewer)
      return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const fromStage = pitch.stage;

    // Reject is a terminal side-exit, not a forward advance.
    if (body.reject) {
      if (!canAdvanceStage(fromStage, viewer.role)) {
        return NextResponse.json({ error: 'Your role cannot move this pitch.' }, { status: 403 });
      }
      await supabase.from('org_pitch_stage_transition').insert({
        pitch_id: pitch.id,
        org_id: orgId,
        from_stage: fromStage,
        to_stage: 'rejected',
        actor_member_id: viewer.id,
        gate_snapshot: [],
      });
      await supabase
        .from('org_pitches')
        .update({
          stage: 'rejected',
          decision: 'rejected',
          stage_entered_at: new Date().toISOString(),
        })
        .eq('id', pitch.id);
      const detail = await fetchPitchDetail(supabase, orgId, pitch.id);
      return NextResponse.json({ pitch: detail });
    }

    const cfg = STAGE_CONFIG[fromStage];
    if (!cfg) {
      return NextResponse.json({ error: `Stage ${fromStage} cannot advance.` }, { status: 400 });
    }

    // Role gate — enforced regardless of what the client posts.
    if (!canAdvanceStage(fromStage, viewer.role)) {
      return NextResponse.json({ error: 'Your role cannot advance this pitch.' }, { status: 403 });
    }

    // Recompute every gate from the DB.
    const ctx = await buildGateContext(supabase, orgId, pitch);
    const gateResults = evaluateGates(fromStage, pitch, ctx);
    const passed = allGatesPass(gateResults);

    let override = false;
    if (!passed) {
      const wantsOverride = Boolean(body.override);
      const reason = (body.override_reason || '').trim();
      if (!wantsOverride) {
        return NextResponse.json(
          { error: 'Gates failing', gates: gateResults.filter((g) => g.status !== 'pass') },
          { status: 422 },
        );
      }
      // ic_vote is NEVER overridable — overrideRoles is []. This blocks the CIO too.
      if (!canOverrideStage(fromStage, viewer.role)) {
        return NextResponse.json({ error: 'This stage cannot be overridden.' }, { status: 403 });
      }
      if (reason.length < OVERRIDE_MIN_CHARS) {
        return NextResponse.json(
          { error: `Override reason must be at least ${OVERRIDE_MIN_CHARS} characters.` },
          { status: 400 },
        );
      }
      override = true;
    }

    const toStage = cfg.next;

    // Append-only transition with the full immutable gate snapshot.
    const { error: transErr } = await supabase.from('org_pitch_stage_transition').insert({
      pitch_id: pitch.id,
      org_id: orgId,
      from_stage: fromStage,
      to_stage: toStage,
      actor_member_id: viewer.id,
      gate_snapshot: gateResults,
      override,
      override_reason: override ? (body.override_reason || '').trim() : null,
    });
    if (transErr) return NextResponse.json({ error: transErr.message }, { status: 500 });

    // Side effects on transition (spec §3.3, minimal set).
    const updates = { stage: toStage, stage_entered_at: new Date().toISOString() };
    if (toStage === 'approved') updates.decision = 'accepted';

    const { error: updErr } = await supabase.from('org_pitches').update(updates).eq('id', pitch.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    const detail = await fetchPitchDetail(supabase, orgId, pitch.id);
    return NextResponse.json({ pitch: detail, from: fromStage, to: toStage, override });
  },
  { requireAuth: true },
);
