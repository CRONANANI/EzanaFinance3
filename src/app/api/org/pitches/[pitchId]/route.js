import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getPitchById } from '@/lib/org-pitches';
import { getPitchRaw, updatePitch } from '@/lib/org-pitch-store';
import { canEditThesis } from '@/lib/org-pitch-state-machine';
import { getPitchApiContext } from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const pitch = getPitchById(params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
    return NextResponse.json({ pitch });
  },
  { requireAuth: true },
);

export const PATCH = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { viewer } = await getPitchApiContext();
    const pitch = getPitchRaw(params.pitchId);
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
      'catalysts',
      'risks',
      'target_price',
      'expected_return_pct',
      'time_horizon',
    ]) {
      if (body[key] !== undefined) patch[key] = body[key];
    }

    updatePitch(pitch.id, patch);
    return NextResponse.json({ pitch: getPitchById(pitch.id) });
  },
  { requireAuth: true },
);
