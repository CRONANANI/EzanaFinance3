import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { logOrgAction } from '@/lib/org-audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* POST /api/org/cohorts/:id/archive — executive only.
   Snapshots the fund's current state into archived_snapshot, marks the cohort
   archived, and (optionally) graduates members flagged is_graduating. */
export const POST = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, ['executive'])) {
      return NextResponse.json({ error: 'Executive role required' }, { status: 403 });
    }
    const { id } = await resolveParams(context);

    let body = {};
    try {
      body = await request.json();
    } catch {
      /* graduate defaults to true */
    }
    const graduate = body?.graduate !== false;

    const { data: cohort } = await supabase
      .from('org_cohorts')
      .select('*')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
    if (cohort.archived) {
      return NextResponse.json({ error: 'Cohort already archived' }, { status: 400 });
    }

    const orgId = member.org_id;

    // ── Build the snapshot: roster, team portfolios, pitch track record ──────
    const { data: members } = await supabase
      .from('org_members')
      .select('id, user_id, display_name, role, sub_role, title, is_graduating, team_id')
      .eq('org_id', orgId)
      .eq('is_active', true);

    const { data: teams } = await supabase.from('org_teams').select('id, name').eq('org_id', orgId);
    const teamIds = (teams || []).map((t) => t.id);

    let portfolios = [];
    if (teamIds.length > 0) {
      const { data: pf } = await supabase
        .from('org_team_portfolios')
        .select('team_id, ticker_symbol, shares, avg_cost, current_value, sector')
        .in('team_id', teamIds);
      portfolios = pf || [];
    }

    const { data: pitches } = await supabase
      .from('org_pitches')
      .select('id, ticker, decision, expected_return_pct')
      .eq('org_id', orgId);
    const pitchIds = (pitches || []).map((p) => p.id);

    let hindsight = [];
    if (pitchIds.length > 0) {
      const { data: h } = await supabase
        .from('org_pitch_hindsight')
        .select('pitch_id, return_pct, alpha_pct')
        .in('pitch_id', pitchIds);
      hindsight = h || [];
    }

    const totalValue = portfolios.reduce((s, p) => s + (Number(p.current_value) || 0), 0);
    const alphas = hindsight.map((h) => Number(h.alpha_pct)).filter((n) => Number.isFinite(n));
    const avgAlpha = alphas.length ? alphas.reduce((a, b) => a + b, 0) / alphas.length : null;
    const wins = hindsight.filter((h) => Number(h.alpha_pct) > 0).length;

    const snapshot = {
      archived_at: new Date().toISOString(),
      roster: (members || []).map((m) => ({
        display_name: m.display_name,
        role: m.role,
        sub_role: m.sub_role,
        title: m.title,
        graduated: graduate && m.is_graduating,
      })),
      portfolios,
      fund: {
        total_value: totalValue,
        positions: portfolios.length,
        pitch_count: (pitches || []).length,
        hit_rate: hindsight.length ? wins / hindsight.length : null,
        avg_alpha_pct: avgAlpha,
      },
      pitch_track_record: (pitches || []).map((p) => {
        const h = hindsight.find((x) => x.pitch_id === p.id);
        return {
          ticker: p.ticker,
          decision: p.decision,
          return_pct: h ? Number(h.return_pct) : null,
          alpha_pct: h ? Number(h.alpha_pct) : null,
        };
      }),
    };

    const { data: updated, error: updErr } = await supabase
      .from('org_cohorts')
      .update({
        archived: true,
        archived_at: new Date().toISOString(),
        archived_snapshot: snapshot,
        is_current: false,
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .select('*')
      .single();
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    // Graduate (deactivate) the members flagged is_graduating.
    let graduatedCount = 0;
    if (graduate) {
      const gradIds = (members || []).filter((m) => m.is_graduating).map((m) => m.id);
      if (gradIds.length > 0) {
        const { error: gErr } = await supabase
          .from('org_members')
          .update({ is_active: false })
          .in('id', gradIds)
          .eq('org_id', orgId);
        if (!gErr) graduatedCount = gradIds.length;
      }
    }

    if (isServerSupabaseConfigured()) {
      await logOrgAction(createServerSupabaseClient(), {
        orgId,
        actorId: member.user_id,
        action: 'cohort_archived',
        targetType: 'cohort',
        targetId: id,
        detail: { name: cohort.name, graduated: graduatedCount },
      });
    }

    return NextResponse.json({ cohort: updated, graduated: graduatedCount });
  },
  { requireAuth: true },
);
