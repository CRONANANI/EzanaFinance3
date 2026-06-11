import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

/* GET /api/org/competitions — inter-university competitions + this org's entries. */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { data: comps, error } = await supabase
      .from('competitions')
      .select('id, name, description, starts_at, ends_at, status, is_inter_org')
      .eq('is_inter_org', true)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Which of these has the caller's org already entered?
    const { data: myEntries } = await supabase
      .from('competition_org_entries')
      .select('competition_id, status, rank, return_pct')
      .eq('org_id', member.org_id);
    const entryByComp = new Map((myEntries || []).map((e) => [e.competition_id, e]));

    const competitions = (comps || []).map((c) => ({
      ...c,
      myEntry: entryByComp.get(c.id) || null,
    }));

    return NextResponse.json({
      competitions,
      viewer: { orgId: member.org_id, canEnter: assertOrgRole(member, MANAGER_ROLES) },
    });
  },
  { requireAuth: true },
);

/* POST /api/org/competitions — enter a competition (manager only). */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const competitionId = body?.competition_id;
    if (!competitionId) return NextResponse.json({ error: 'competition_id required' }, { status: 400 });

    const { data: comp } = await supabase
      .from('competitions')
      .select('id, is_inter_org')
      .eq('id', competitionId)
      .maybeSingle();
    if (!comp || !comp.is_inter_org) {
      return NextResponse.json({ error: 'Not an inter-university competition' }, { status: 404 });
    }

    // Seed the entry's current value from the org's team portfolio total.
    const { data: teams } = await supabase.from('org_teams').select('id').eq('org_id', member.org_id);
    const teamIds = (teams || []).map((t) => t.id);
    let totalValue = 0;
    if (teamIds.length > 0) {
      const { data: pf } = await supabase
        .from('org_team_portfolios')
        .select('current_value')
        .in('team_id', teamIds);
      totalValue = (pf || []).reduce((s, p) => s + (Number(p.current_value) || 0), 0);
    }

    const { data, error } = await supabase
      .from('competition_org_entries')
      .upsert(
        {
          competition_id: competitionId,
          org_id: member.org_id,
          team_id: member.team_id || null,
          entered_by: member.user_id,
          current_value: totalValue || null,
          status: 'active',
        },
        { onConflict: 'competition_id,org_id' },
      )
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data });
  },
  { requireAuth: true },
);
