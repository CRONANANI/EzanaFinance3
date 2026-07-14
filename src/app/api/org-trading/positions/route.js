import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  buildOrgPositionBook,
  coveringAnalystNameForPosition,
  dbTeamIdFromMockTeamId,
  getMemberPermissions,
} from '@/lib/orgMockData';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Flaggable positions for the caller — the data source for the flag modal's
 * position switcher. The permission gate is enforced HERE, server-side: a member
 * without `flag_positions` receives an EMPTY book, never the council's holdings.
 * The client must not fetch the whole book and filter locally — that would leak
 * positions a restricted member should not see. Scoped to the caller's own org
 * (org resolved from their authenticated membership, never from the request).
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

    // Server-enforced: no flag permission → no positions leave the server.
    if (!canFlag) {
      return NextResponse.json({ positions: [], can_flag_positions: false });
    }

    // Resolve this org's teams once so each position carries its real team UUID.
    const { data: orgTeams } = await supabase
      .from('org_teams')
      .select('id, slug')
      .eq('org_id', member.org_id);

    const positions = buildOrgPositionBook().map((p) => ({
      ticker: p.ticker,
      mockTeamId: p.sectorId,
      teamDbId: dbTeamIdFromMockTeamId(orgTeams || [], p.sectorId),
      sector: p.sectorName,
      analyst: coveringAnalystNameForPosition(p.ticker, p.sectorId),
      plPct: p.plPct,
      position: p,
    }));

    return NextResponse.json({ positions, can_flag_positions: true });
  },
  { requireAuth: true },
);
