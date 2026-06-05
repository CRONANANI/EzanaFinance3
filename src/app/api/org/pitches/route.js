import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { FmpAPI } from '@/lib/services/fmp';
import { createPitch } from '@/lib/org-pitch-store';
import { getActivePitches, getPitchById } from '@/lib/org-pitches';
import { getPitchApiContext, requirePermission } from '@/lib/org-pitch-api-helpers';
import { notifyStageChange } from '@/lib/org-pitch-notifications';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    const { viewer } = await getPitchApiContext();
    const { searchParams } = new URL(request.url);
    const pitches = getActivePitches({
      viewer,
      team_id: searchParams.get('team_id') || undefined,
      stage: searchParams.get('stage') || undefined,
    });
    return NextResponse.json({ pitches });
  },
  { requireAuth: true },
);

export const POST = withApiGuard(
  async (request, user) => {
    const { supabase, member, viewer, orgId } = await getPitchApiContext();
    const denied = requirePermission(viewer, 'pitch.submit');
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const {
      ticker,
      pitch_type,
      time_horizon,
      target_price,
      expected_return_pct,
      thesis_short,
      thesis_full,
      why_now,
      catalysts,
      risks,
      team_id,
    } = body;

    if (!ticker || !pitch_type || !thesis_short?.trim()) {
      return NextResponse.json(
        { error: 'ticker, pitch_type, and thesis_short required' },
        { status: 400 },
      );
    }

    let company_name = body.company_name;
    let current_price = body.current_price_at_submission;
    try {
      const [profile, quote] = await Promise.all([
        FmpAPI.getCompanyProfile(ticker),
        FmpAPI.getQuote(ticker),
      ]);
      company_name = company_name || profile?.companyName || ticker;
      current_price = current_price ?? quote?.price ?? null;
    } catch {
      company_name = company_name || ticker;
    }

    const pitch = createPitch({
      org_id: orgId,
      team_id: team_id || viewer.team_id,
      ticker,
      company_name,
      pitch_type,
      time_horizon,
      target_price,
      expected_return_pct,
      thesis_short: thesis_short.slice(0, 280),
      thesis_full,
      why_now,
      catalysts: Array.isArray(catalysts) ? catalysts : [],
      risks: Array.isArray(risks) ? risks : [],
      current_price_at_submission: current_price,
      analyst_member_id: viewer.id,
    });

    await notifyStageChange(supabase, orgId, pitch.id, 'idea', viewer.id);

    return NextResponse.json({ pitch: getPitchById(pitch.id) }, { status: 201 });
  },
  { requireAuth: true },
);
