import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { computeFundPerformance } from '@/lib/org-attribution';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROLE_TITLES = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio Manager',
  analyst: 'Analyst',
};

/* GET /api/org/team-hub/summary — one round-trip for the Team Hub home page:
   fund performance, sector desk (per-team sleeves ranked by ROI), hero stat
   strip (cohort / my assignments / IPS violations), member+team+task counts,
   fund-value snapshots for the hero chart, and the organization card. */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const orgId = member.org_id;

    const [
      performance,
      { data: org },
      { data: members },
      { data: teams },
      { data: positions },
      { data: cohorts },
      { data: myAssignments },
      { data: violations },
      { data: tasks },
      { data: snapshots },
    ] = await Promise.all([
      computeFundPerformance(supabase, orgId),
      supabase.from('organizations').select('name, university_name').eq('id', orgId).maybeSingle(),
      supabase
        .from('org_members')
        .select('id, user_id, display_name, role, sub_role, team_id')
        .eq('org_id', orgId)
        .eq('is_active', true),
      supabase.from('org_teams').select('id, name').eq('org_id', orgId).order('name'),
      supabase
        .from('org_team_portfolios')
        .select('team_id, ticker_symbol, shares, avg_cost, current_value'),
      supabase
        .from('org_cohorts')
        .select('name, is_current')
        .eq('org_id', orgId)
        .eq('is_current', true)
        .limit(1),
      supabase
        .from('org_assignments')
        .select('id, status')
        .eq('org_id', orgId)
        .eq('assigned_to', member.user_id)
        .eq('status', 'assigned'),
      supabase
        .from('org_ips_violations')
        .select('id')
        .eq('org_id', orgId)
        .eq('resolved', false),
      supabase
        .from('org_tasks')
        .select('id, status')
        .eq('org_id', orgId),
      supabase
        .from('org_fund_snapshots')
        .select('snapshot_date, total_value, total_cost, benchmark_return_pct')
        .eq('org_id', orgId)
        .order('snapshot_date', { ascending: true })
        .limit(64),
    ]);

    // ── Sector desk: per-team sleeves ranked by ROI ──────────────
    const teamIds = new Set((teams || []).map((t) => t.id));
    const byTeam = new Map();
    for (const p of positions || []) {
      if (!teamIds.has(p.team_id)) continue; // RLS already scopes, belt & braces
      if (!byTeam.has(p.team_id)) byTeam.set(p.team_id, { value: 0, cost: 0, holdings: [] });
      const slot = byTeam.get(p.team_id);
      const value = Number(p.current_value) || 0;
      slot.value += value;
      slot.cost += (Number(p.avg_cost) || 0) * (Number(p.shares) || 0);
      slot.holdings.push({ ticker: p.ticker_symbol, value });
    }
    const sectors = (teams || [])
      .map((t) => {
        const slot = byTeam.get(t.id) || { value: 0, cost: 0, holdings: [] };
        const roiPct = slot.cost > 0 ? ((slot.value - slot.cost) / slot.cost) * 100 : null;
        return {
          teamId: t.id,
          name: t.name,
          value: slot.value,
          roiPct,
          tickers: slot.holdings
            .sort((a, b) => b.value - a.value)
            .slice(0, 3)
            .map((h) => h.ticker),
        };
      })
      .sort((a, b) => (b.roiPct ?? -Infinity) - (a.roiPct ?? -Infinity));

    // ── Organization card: role-aware "you oversee" ──────────────
    const active = members || [];
    const pms = active.filter((m) => m.role === 'portfolio_manager');
    const analysts = active.filter((m) => m.role === 'analyst');
    let oversee = [];
    if (member.role === 'executive') {
      oversee = pms;
    } else if (member.role === 'portfolio_manager') {
      oversee = analysts.filter((m) => m.team_id && m.team_id === member.team_id);
    } else {
      oversee = active.filter((m) => m.team_id === member.team_id && m.user_id !== member.user_id);
    }

    return NextResponse.json({
      org: { name: org?.university_name || org?.name || 'Organization' },
      viewer: {
        memberId: member.id,
        userId: member.user_id,
        role: member.role,
        displayName: member.display_name,
        title: member.sub_role || ROLE_TITLES[member.role] || 'Member',
      },
      performance,
      counts: {
        members: active.length,
        teams: (teams || []).length,
        openTasks: (tasks || []).filter((t) => t.status !== 'completed').length,
      },
      statStrip: {
        cohort: cohorts?.[0]?.name || null,
        myAssignments: (myAssignments || []).length,
        openViolations: (violations || []).length,
      },
      sectors,
      snapshots: (snapshots || []).map((s) => ({
        date: s.snapshot_date,
        value: Number(s.total_value) || 0,
        benchmarkValue:
          s.total_cost != null && s.benchmark_return_pct != null
            ? Number(s.total_cost) * (1 + Number(s.benchmark_return_pct) / 100)
            : null,
      })),
      organization: {
        you: {
          name: member.display_name,
          title: member.sub_role || ROLE_TITLES[member.role] || 'Member',
          role: member.role,
        },
        oversee: oversee.map((m) => ({ name: m.display_name, role: m.role })),
        pmCount: pms.length,
        analystCount: analysts.length,
      },
    });
  },
  { requireAuth: true },
);
