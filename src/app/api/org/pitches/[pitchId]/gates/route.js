import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getPitchContext, fetchPitchRaw } from '@/lib/org-pitch-api-helpers';
import { buildGateContext } from '@/lib/pitch/gate-context';
import { evaluateGates } from '@/lib/pitch/gates';
import { STAGE_CONFIG, canAdvanceStage, canOverrideStage } from '@/lib/pitch/stage-config';
import { stageLabel } from '@/lib/pitch/stages';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/org/pitches/[pitchId]/gates
 * The Gate Panel's data source — recomputes the current stage's gates from the
 * DB so the panel shows real, specific blockers (never the client's guess).
 */
export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, viewer, orgId } = await getPitchContext();
    if (!orgId || !viewer)
      return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const cfg = STAGE_CONFIG[pitch.stage];
    const ctx = await buildGateContext(supabase, orgId, pitch);
    const gates = evaluateGates(pitch.stage, pitch, ctx);
    const passedCount = gates.filter((g) => g.status === 'pass').length;

    return NextResponse.json({
      stage: pitch.stage,
      stageLabel: stageLabel(pitch.stage),
      nextStage: cfg?.next || null,
      nextStageLabel: cfg?.next ? stageLabel(cfg.next) : null,
      gates,
      passedCount,
      total: gates.length,
      allPass: gates.length === 0 || passedCount === gates.length,
      canAdvance: !!cfg && canAdvanceStage(pitch.stage, viewer.role),
      canOverride: !!cfg && canOverrideStage(pitch.stage, viewer.role),
    });
  },
  { requireAuth: true },
);
