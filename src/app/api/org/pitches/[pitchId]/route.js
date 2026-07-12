import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { canEditThesis } from '@/lib/org-pitch-state-machine';
import {
  getPitchContext,
  fetchPitchRaw,
  fetchPitchDetail,
  patchPitch,
} from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const pitch = await fetchPitchDetail(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
    return NextResponse.json({ pitch });
  },
  { requireAuth: true },
);

export const PATCH = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, viewer, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    if (pitch.analyst_member_id !== viewer.id && viewer.role === 'analyst') {
      return NextResponse.json({ error: 'Only the authoring analyst can edit' }, { status: 403 });
    }
    if (!canEditThesis(pitch)) {
      return NextResponse.json({ error: 'Thesis locked after PM review stage' }, { status: 400 });
    }

    const body = await request.json();
    const patch = {};
    for (const key of [
      'thesis_short',
      'thesis_full',
      'why_now',
      'variant_perception',
      'sector',
      'catalysts',
      'risks',
      'catalyst_date',
      'target_price',
      'expected_return_pct',
      'time_horizon',
      'valuation_method',
      'valuation_bull',
      'valuation_base',
      'valuation_bear',
      'conviction_level',
      'position_size_pct',
      'last_reaffirmed_at',
    ]) {
      if (body[key] !== undefined) patch[key] = body[key];
    }

    const result = await patchPitch(supabase, orgId, pitch.id, patch);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    const detail = await fetchPitchDetail(supabase, orgId, pitch.id);
    return NextResponse.json({ pitch: detail });
  },
  { requireAuth: true },
);
