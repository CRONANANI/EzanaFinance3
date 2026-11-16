/**
 * GET /api/org/market-analysis   the Council view of Global Market Analysis
 *
 * The parts of the Council view that US Equities does not already load
 * (the book, teams, coverage, rules and latest benchmark come from
 * GET /api/org/company-research): the fund snapshot series, the council's
 * documents (the page keeps those with no single ticker or a macro tag),
 * upcoming meetings and the council's standing on Council Rankings.
 *
 * Every read runs as the signed-in member through the RLS-scoped client and
 * is scoped to the member's own council; RLS stays the gate (documents the
 * member cannot read never arrive). Council Rankings reads only the public
 * leaderboard columns (rating, tier, council name). No service-role client.
 * Each part fails on its own: a part that cannot be read arrives as null and
 * the page shows that card's error.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRIVATE = { 'Cache-Control': 'private, no-store' };
const MANAGER_ROLES = ['executive', 'portfolio_manager'];

async function loadStanding(supabase) {
  const { data: elo, error } = await supabase
    .from('council_elo')
    .select('org_id, current_rating, tier')
    .order('current_rating', { ascending: false })
    .limit(200);
  if (error) return null;
  const ids = (elo || []).map((r) => r.org_id);
  let orgs = [];
  if (ids.length) {
    const res = await supabase
      .from('organizations')
      .select('id, name, university_name')
      .in('id', ids);
    if (res.error) return null;
    orgs = res.data || [];
  }
  const byId = new Map(orgs.map((o) => [o.id, o]));
  return (elo || []).map((r) => ({
    orgId: r.org_id,
    name: byId.get(r.org_id)?.university_name || byId.get(r.org_id)?.name || 'Council',
    rating: r.current_rating,
    tier: r.tier,
  }));
}

export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const orgId = member.org_id;
    const since = new Date(Date.now() - 6 * 3600000).toISOString();

    const [snaps, notes, members, meetings, standing] = await Promise.all([
      supabase
        .from('org_fund_snapshots')
        .select(
          'snapshot_date, total_value, total_cost, benchmark_return_pct, benchmark_symbol, benchmark_source',
        )
        .eq('org_id', orgId)
        .order('snapshot_date', { ascending: false })
        .limit(800),
      supabase
        .from('org_research_notes')
        .select(
          'id, title, doc_type, status, sector, tags, ticker, author_id, created_at, published_at',
        )
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(300),
      supabase.from('org_members').select('user_id, display_name').eq('org_id', orgId),
      supabase
        .from('org_meetings')
        .select('id, title, category, status, scheduled_at')
        .eq('org_id', orgId)
        .neq('status', 'closed')
        .gte('scheduled_at', since)
        .order('scheduled_at', { ascending: true })
        .limit(20),
      loadStanding(supabase).catch(() => null),
    ]);

    const rows = snaps.error ? null : [...(snaps.data || [])].reverse();
    const last = rows && rows.length ? rows[rows.length - 1] : null;

    return NextResponse.json(
      {
        now: Date.now(),
        viewer: {
          role: member.role,
          userId: member.user_id,
          canManage: MANAGER_ROLES.includes(member.role),
        },
        snapshots: rows
          ? rows.map((s) => ({
              date: s.snapshot_date,
              value: s.total_value,
              cost: s.total_cost,
              benchmarkPct: s.benchmark_return_pct,
            }))
          : null,
        benchmark: last
          ? { symbol: last.benchmark_symbol || null, source: last.benchmark_source || null }
          : null,
        members: members.error ? [] : members.data || [],
        notes: notes.error ? null : notes.data || [],
        meetings: meetings.error ? null : meetings.data || [],
        standing: standing ? { rows: standing, myOrgId: orgId } : null,
      },
      { headers: PRIVATE },
    );
  },
  { requireAuth: true },
);
