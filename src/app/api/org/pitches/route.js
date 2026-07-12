import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { FmpAPI } from '@/lib/services/fmp';
import {
  getPitchContext,
  requirePermission,
  fetchPitches,
  fetchDeliverablesMap,
  loadDirectory,
  enrichPitchRow,
  insertPitch,
  fetchPitchDetail,
  MANAGER_ROLES,
} from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Cohort onboarding gate (server-side): a non-manager still in onboarding cannot
 * submit a live pitch while their cohort's gate is on and they have an
 * incomplete gate task. Completion mirrors the onboarding matrix route: a task
 * is "done" when the member's account has a submission for that assignment.
 */
async function isBlockedByOnboardingGate(supabase, member) {
  if (!member?.cohort_id || member.lifecycle_status !== 'onboarding') return false;

  const { data: cohort } = await supabase
    .from('org_cohorts')
    .select('onboarding_gate')
    .eq('id', member.cohort_id)
    .eq('org_id', member.org_id)
    .maybeSingle();
  if (!cohort?.onboarding_gate) return false;

  const { data: gateTasks } = await supabase
    .from('org_onboarding_tasks')
    .select('assignment_id')
    .eq('org_id', member.org_id)
    .eq('cohort_id', member.cohort_id)
    .eq('is_gate', true);
  const gateAssignmentIds = (gateTasks || []).map((t) => t.assignment_id).filter(Boolean);
  if (gateAssignmentIds.length === 0) return false;

  // No linked account means no submissions can exist → gate not satisfied.
  if (!member.user_id) return true;

  const { data: subs } = await supabase
    .from('org_assignment_submissions')
    .select('assignment_id')
    .in('assignment_id', gateAssignmentIds)
    .eq('submitted_by', member.user_id);
  const doneSet = new Set((subs || []).map((s) => s.assignment_id));
  return gateAssignmentIds.some((aid) => !doneSet.has(aid));
}

export const GET = withApiGuard(
  async (request) => {
    const { supabase, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ pitches: [] });

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('team_id') || undefined;
    const stage = searchParams.get('stage') || undefined;

    const rows = (await fetchPitches(supabase, orgId, { teamId, statuses: ['active'] })).filter(
      (p) => !stage || p.stage === stage,
    );
    const delMap = await fetchDeliverablesMap(
      supabase,
      rows.map((r) => r.id),
    );
    const { memberMap, teamMap } = await loadDirectory(supabase, orgId);
    const pitches = rows.map((r) =>
      enrichPitchRow(r, { memberMap, teamMap, deliverables: delMap.get(r.id) || [] }),
    );
    return NextResponse.json({ pitches });
  },
  { requireAuth: true },
);

export const POST = withApiGuard(
  async (request) => {
    const { supabase, member, viewer, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const denied = requirePermission(viewer, 'pitch.submit');
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    // Managers (executive / portfolio_manager) are exempt from the gate.
    if (
      !MANAGER_ROLES.includes(viewer.role) &&
      (await isBlockedByOnboardingGate(supabase, member))
    ) {
      return NextResponse.json(
        {
          error: 'Complete your required onboarding tasks before submitting a live pitch.',
          gate: 'onboarding',
        },
        { status: 403 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { ticker, pitch_type, thesis_short } = body;
    if (!ticker || !pitch_type || !thesis_short?.trim()) {
      return NextResponse.json(
        { error: 'ticker, pitch_type, and thesis_short required' },
        { status: 400 },
      );
    }

    // Resolve company + pitch price from FMP; never fabricate on failure.
    let company_name = body.company_name;
    let current_price = body.current_price_at_submission ?? null;
    let sector = body.sector || null;
    try {
      const [profile, quote] = await Promise.all([
        FmpAPI.getCompanyProfile(ticker),
        FmpAPI.getQuote(ticker),
      ]);
      company_name = company_name || profile?.companyName || ticker;
      sector = sector || profile?.sector || null;
      current_price = current_price ?? quote?.price ?? null;
    } catch {
      company_name = company_name || ticker;
    }

    const result = await insertPitch(supabase, orgId, viewer, {
      team_id: body.team_id || viewer.team_id,
      ticker,
      company_name,
      pitch_type,
      sector,
      time_horizon: body.time_horizon,
      target_price: body.target_price,
      pitch_price: current_price,
      expected_return_pct: body.expected_return_pct,
      thesis_short: thesis_short.slice(0, 280),
      thesis_full: body.thesis_full,
      why_now: body.why_now,
      variant_perception: body.variant_perception,
      catalysts: Array.isArray(body.catalysts) ? body.catalysts : [],
      risks: Array.isArray(body.risks) ? body.risks : [],
      catalyst_date: body.catalyst_date,
      valuation_method: body.valuation_method,
      valuation_bull: body.valuation_bull,
      valuation_base: body.valuation_base,
      valuation_bear: body.valuation_bear,
      conviction_level: body.conviction_level,
      position_size_pct: body.position_size_pct,
      current_price_at_submission: current_price,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    const detail = await fetchPitchDetail(supabase, orgId, result.pitch.id);
    return NextResponse.json({ pitch: detail }, { status: 201 });
  },
  { requireAuth: true },
);
