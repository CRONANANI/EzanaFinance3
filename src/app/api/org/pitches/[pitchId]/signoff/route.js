import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getPitchContext, fetchPitchRaw } from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Screening-stage sign-offs (spec §5.2 SignoffPanel · gate senior_analyst_signoffs).
 *
 * Eligibility is enforced SERVER-SIDE — a junior analyst who POSTs directly is
 * rejected. The spec's abstract tiers map onto this repo's real `tier` ladder:
 *   spec senior_analyst        → tier 'senior_analyst'
 *   spec junior_pm             → tier 'portfolio_manager'
 *   spec senior_pm             → tier 'senior_portfolio_manager'
 *   spec senior_portfolio_mgr  → tier 'senior_portfolio_manager' / above
 * plus the coarse role gate (executive / portfolio_manager). Only tier 'analyst'
 * (junior analysts) is excluded.
 */
const SIGNOFF_ELIGIBLE_TIERS = new Set([
  'senior_analyst',
  'portfolio_manager',
  'senior_portfolio_manager',
  'vice_president',
  'executive',
  'president',
]);

const VALID_SCOPES = ['model', 'qualitative'];
const VALID_DECISIONS = ['approve', 'request_changes'];

/** Server-side eligibility: may this member sign off on a pitch? */
function canSignOff(member) {
  if (!member) return false;
  if (member.role === 'executive' || member.role === 'portfolio_manager') return true;
  return SIGNOFF_ELIGIBLE_TIERS.has(member.tier);
}

// ── GET — list every eligible member and their sign-off state ────────────────
export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, member, orgId } = await getPitchContext();
    if (!orgId || !member)
      return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const [signoffRes, deskRes, cfgRes] = await Promise.all([
      supabase
        .from('org_pitch_signoff')
        .select('member_id, scope, decision, in_desk, comment, created_at')
        .eq('pitch_id', pitch.id),
      supabase
        .from('org_members')
        .select('id, display_name, role, tier, team_id')
        .eq('org_id', orgId)
        .eq('team_id', pitch.team_id)
        .eq('is_active', true),
      supabase
        .from('org_desk_config')
        .select('min_senior_signoffs')
        .eq('team_id', pitch.team_id)
        .maybeSingle(),
    ]);

    const signoffs = signoffRes.data || [];
    const required = cfgRes.data?.min_senior_signoffs ?? 3;

    // Eligible roster = in-desk eligible members, PLUS any out-of-desk member who
    // has already signed off (a thin desk can borrow senior analysts elsewhere).
    const roster = new Map();
    for (const m of deskRes.data || []) {
      if (canSignOff(m)) roster.set(m.id, { ...m, in_desk: true });
    }
    const missingIds = [
      ...new Set(signoffs.map((s) => s.member_id).filter((id) => !roster.has(id))),
    ];
    if (missingIds.length) {
      const { data: extra } = await supabase
        .from('org_members')
        .select('id, display_name, role, tier, team_id')
        .eq('org_id', orgId)
        .in('id', missingIds);
      for (const m of extra || []) {
        roster.set(m.id, { ...m, in_desk: m.team_id === pitch.team_id });
      }
    }

    const byMember = new Map();
    for (const s of signoffs) {
      if (!byMember.has(s.member_id)) byMember.set(s.member_id, {});
      byMember.get(s.member_id)[s.scope] = {
        decision: s.decision,
        comment: s.comment || null,
        created_at: s.created_at,
      };
    }

    const members = [...roster.values()]
      .map((m) => {
        const state = byMember.get(m.id) || {};
        return {
          member_id: m.id,
          display_name: m.display_name || 'Member',
          role: m.role,
          tier: m.tier,
          in_desk: m.in_desk,
          model: state.model || null,
          qualitative: state.qualitative || null,
        };
      })
      .sort((a, b) => {
        if (a.in_desk !== b.in_desk) return a.in_desk ? -1 : 1;
        return (a.display_name || '').localeCompare(b.display_name || '');
      });

    // Progress: distinct members with ≥1 'approve' sign-off (matches the panel's
    // "N of M" members reading). ≥1 must be in-desk for the gate to pass.
    const approvedMembers = members.filter(
      (m) => m.model?.decision === 'approve' || m.qualitative?.decision === 'approve',
    );
    const approvedCount = approvedMembers.length;
    const inDeskApproved = approvedMembers.filter((m) => m.in_desk).length;

    return NextResponse.json({
      pitchId: pitch.id,
      stage: pitch.stage,
      required,
      approvedCount,
      inDeskApproved,
      gatePass: approvedCount >= required && inDeskApproved >= 1,
      members,
      viewer: {
        id: member.id,
        eligible: canSignOff(member),
        in_desk: member.team_id === pitch.team_id,
      },
    });
  },
  { requireAuth: true },
);

// ── POST — record (or replace) the viewer's sign-off for one scope ───────────
export const POST = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, member, orgId } = await getPitchContext();
    if (!orgId || !member)
      return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    // Server-side eligibility — the whole security model. A junior analyst
    // hitting this endpoint directly is rejected here, not just in the UI.
    if (!canSignOff(member)) {
      return NextResponse.json(
        { error: 'Not eligible to sign off — requires Senior Analyst tier or above' },
        { status: 403 },
      );
    }

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const scope = body.scope;
    const decision = body.decision;
    if (!VALID_SCOPES.includes(scope)) {
      return NextResponse.json(
        { error: "scope must be 'model' or 'qualitative'" },
        { status: 400 },
      );
    }
    if (!VALID_DECISIONS.includes(decision)) {
      return NextResponse.json(
        { error: "decision must be 'approve' or 'request_changes'" },
        { status: 400 },
      );
    }

    const in_desk = member.team_id === pitch.team_id;
    const comment = typeof body.comment === 'string' ? body.comment.trim() || null : null;

    // Upsert on (pitch_id, member_id, scope). The table has INSERT + DELETE RLS
    // policies but no UPDATE policy, so replace = delete-then-insert (both are
    // scoped to the acting member). Idempotent per (member, scope).
    await supabase
      .from('org_pitch_signoff')
      .delete()
      .eq('pitch_id', pitch.id)
      .eq('member_id', member.id)
      .eq('scope', scope);

    const { error } = await supabase.from('org_pitch_signoff').insert({
      pitch_id: pitch.id,
      org_id: orgId,
      member_id: member.id,
      scope,
      decision,
      in_desk,
      comment,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
