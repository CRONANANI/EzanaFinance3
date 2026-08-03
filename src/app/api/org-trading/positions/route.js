import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getMemberPermissions } from '@/lib/orgMockData';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { getOrgPositionBook } from '@/lib/org-position-book';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Flaggable positions for the caller — REAL org holdings (org_positions via
 * the canonical book) enriched with the dossier data the flag composer needs:
 * covering analyst + sector head (ids AND names), the latest pitch thesis, and
 * each position's % of AUM. Permission gate stays server-side: no
 * `flag_positions` → empty book, never the council's holdings.
 *
 * These fields are display-only hints; the authoritative routing recipients are
 * still decided at submit time by resolveFlagRoutingDb, server-side.
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
        .select('sector, is_primary, member:org_members(id, display_name, role, is_active)')
        .eq('org_id', member.org_id),
    ]);

    const teamNameById = new Map((orgTeams || []).map((t) => [t.id, t.name]));

    // sector → primary covering analyst (id), plus a name cache we extend below.
    const analystIdBySector = new Map();
    const memberNameById = new Map();
    for (const c of coverage || []) {
      const m = c.member;
      if (!m?.is_active || m.role !== 'analyst' || !c.sector) continue;
      if (m.id && m.display_name) memberNameById.set(m.id, m.display_name);
      if (!analystIdBySector.has(c.sector) || c.is_primary) {
        analystIdBySector.set(c.sector, m.id);
      }
    }

    // Active PMs per team → Map(team_id → { id, display_name }).
    const { data: pmRows } = await supabase
      .from('org_members')
      .select('id, display_name, team_id')
      .eq('org_id', member.org_id)
      .eq('role', 'portfolio_manager')
      .eq('is_active', true);
    const pmByTeam = new Map();
    for (const pm of pmRows || []) {
      if (pm.team_id && !pmByTeam.has(pm.team_id)) {
        pmByTeam.set(pm.team_id, { id: pm.id, display_name: pm.display_name });
      }
    }

    // Latest pitch per ticker — first row per ticker after created_at desc wins.
    const bookTickers = [...new Set(book.map((p) => p.ticker))];
    const pitchByTicker = new Map();
    if (bookTickers.length > 0) {
      const { data: pitches } = await supabase
        .from('org_pitches')
        .select('ticker, analyst_member_id, thesis_short, created_at')
        .eq('org_id', member.org_id)
        .in('ticker', bookTickers)
        .order('created_at', { ascending: false });
      for (const p of pitches || []) {
        const sym = (p.ticker || '').toUpperCase();
        if (!pitchByTicker.has(sym)) pitchByTicker.set(sym, p);
      }
    }

    // Resolve pitch analysts' names not already known from coverage (one fetch).
    const pitchAnalystIds = [
      ...new Set([...pitchByTicker.values()].map((p) => p.analyst_member_id).filter(Boolean)),
    ].filter((id) => !memberNameById.has(id));
    if (pitchAnalystIds.length > 0) {
      const { data: pa } = await supabase
        .from('org_members')
        .select('id, display_name')
        .in('id', pitchAnalystIds);
      for (const m of pa || []) memberNameById.set(m.id, m.display_name);
    }

    const totalValue = book.reduce((s, p) => s + p.value, 0);
    const positions = book.map((p) => {
      const pitch = pitchByTicker.get(p.ticker) || null;
      const analystId =
        pitch?.analyst_member_id || (p.sector ? analystIdBySector.get(p.sector) : null) || null;
      const pm = p.team_id ? pmByTeam.get(p.team_id) : null;
      return {
        ticker: p.ticker,
        teamDbId: p.team_id,
        sector: p.sector || teamNameById.get(p.team_id) || null,
        analyst: analystId ? memberNameById.get(analystId) || null : null,
        analyst_member_id: analystId,
        sector_head: pm?.display_name ?? null,
        sector_head_member_id: pm?.id ?? null,
        thesis: pitch?.thesis_short ?? null,
        plPct: p.priced && p.cost > 0 ? (p.pl / p.cost) * 100 : null,
        pct_aum: totalValue > 0 ? (p.value / totalValue) * 100 : null,
        position: p,
      };
    });
    return NextResponse.json({ positions, total_value: totalValue, can_flag_positions: true });
  },
  { requireAuth: true },
);
