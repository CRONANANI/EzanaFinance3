import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import {
  getPitchContext,
  fetchPitchRaw,
  gateSummaryFor,
  viewerStateFor,
} from '@/lib/org-pitch-api-helpers';
import { buildGateContext } from '@/lib/pitch/gate-context';
import { stageLabel } from '@/lib/pitch/stages';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/org/pitches/[pitchId]/gates
 * The Gate Panel's data source: recomputes the current stage's gates from the
 * DB so the panel shows real, specific blockers (never the client's guess).
 */
export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, viewer, member, orgId } = await getPitchContext();
    if (!orgId || !viewer)
      return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const actor = { ...viewer, tier: member?.tier || null };

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const ctx = await buildGateContext(supabase, orgId, pitch);
    // One summary for the gate panel and the board: the current stage's gates
    // only, sealed while a blind vote is open.
    const summary = gateSummaryFor(pitch, ctx, actor);
    const state = viewerStateFor(pitch, ctx, actor);

    return NextResponse.json({
      stage: pitch.stage,
      stageLabel: stageLabel(pitch.stage),
      nextStage: summary.next_stage,
      nextStageLabel: summary.next_stage_label,
      gates: summary.gates,
      passedCount: summary.passed,
      total: summary.total,
      allPass: summary.all_pass,
      hasWarnings: Boolean(summary.has_warnings),
      canAdvance: summary.can_advance,
      canOverride: summary.can_override,
      canReject: state.can_reject,
      canExit: state.can_exit,
      canEditThesis: state.can_edit_thesis,
      ballotsSealed: Boolean(ctx?.ballotsSealed),
    });
  },
  { requireAuth: true },
);
