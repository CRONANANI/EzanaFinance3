import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getMemberPermissions, mockTeamIdFromDbTeams } from '@/lib/orgMockData';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { getOrgPositionBook } from '@/lib/org-position-book';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Flaggable positions for the caller — REAL org holdings (org_positions via
 * the canonical book), no longer the mock demo book. Permission gate stays
 * server-side: no `flag_positions` → empty book, never the council's holdings.
 *
 * `mockTeamId` is retained TEMPORARILY: flag routing (Phase C) still resolves
 * recipients through the mock council chart, and the demo org's team slugs map
 * onto it. For real orgs it resolves to null — identical to current behavior,
 * so no regression. Remove alongside Phase C.
 *
 * Covering analyst comes from org_sector_coverage (real chart data), matched
 * on the position's sector; null when no one covers it.
 */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) {
      return NextResponse.json({ positions: [], can_flag_positions: false });
    }

    const { data: overrideRows } = await supabase
      .from('org_member_permissions')
      .select('permission_key')
      .eq('org_member_id', member.id);
    const overrides = (overrideRows || []).map((r) => r.permission_key);
    const canFlag = getMemberPermissions(member, overrides).includes('flag_positions');
    if (!canFlag) {
      return NextResponse.json({ positions: [], can_flag_positions: false });
    }

    const [book, { data: orgTeams }, { data: coverage }] = await Promise.all([
      getOrgPositionBook(supabase, member.org_id),
      supabase.from('org_teams').select('id, name, slug').eq('org_id', member.org_id),
      supabase
        .from('org_sector_coverage')
        .select('sector, is_primary, member:org_members(display_name, role, is_active)')
        .eq('org_id', member.org_id),
    ]);

    // sector → primary covering analyst display name
    const analystBySector = new Map();
    for (const c of coverage || []) {
      const m = c.member;
      if (!m?.is_active || m.role !== 'analyst' || !c.sector) continue;
      if (!analystBySector.has(c.sector) || c.is_primary) {
        analystBySector.set(c.sector, m.display_name);
      }
    }
    const teamNameById = new Map((orgTeams || []).map((t) => [t.id, t.name]));

    const positions = book.map((p) => ({
      ticker: p.ticker,
      mockTeamId: mockTeamIdFromDbTeams(orgTeams || [], p.team_id), // Phase C compat; null for real orgs
      teamDbId: p.team_id,
      sector: p.sector || teamNameById.get(p.team_id) || null,
      analyst: p.sector ? analystBySector.get(p.sector) || null : null,
      plPct: p.priced && p.cost > 0 ? (p.pl / p.cost) * 100 : null,
      position: p,
    }));

    return NextResponse.json({ positions, can_flag_positions: true });
  },
  { requireAuth: true },
);
