/**
 * GET /api/org/mock-portfolio   Council sandbox on Mock Portfolio (/trading/mock)
 *
 * The parts of the council layer that US Equities does not already load (the
 * book, sector teams, member directory and stored policy rules come from
 * GET /api/org/company-research):
 *   pitches     the council's open pitches: ticker, company, stage, analyst
 *               and expected return (no theses, ballots or tallies)
 *   snapshots   the fund's daily values (date and total value only), for the
 *               sandbox against the real fund
 *   challenges  the fund challenges the council can see, its own entries and
 *               the standings of the ones it entered (rank and return since
 *               entry only, never a fund value in dollars), from the same
 *               loader Competitions uses
 *
 * Read-only. Every read runs as the signed-in member through the RLS-scoped
 * client and is scoped to the member's own council; RLS stays the gate. No
 * service-role client. Each part fails on its own: a part that cannot be read
 * arrives as null and the page shows that card's error. The viewer's paper
 * account is never read here (it keeps its own routes).
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadFundChallenges } from '@/lib/competitions/fund-challenges';
import { CLOSED_PITCH_STAGES } from '@/lib/org-mock-portfolio-model';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRIVATE = { 'Cache-Control': 'private, no-store' };
/* About three years of daily snapshots covers every range the card offers. */
const SNAPSHOT_LIMIT = 1100;

async function pitchesPart(supabase, orgId) {
  const { data, error } = await supabase
    .from('org_pitches')
    .select(
      'id, ticker, company_name, stage, status, analyst_member_id, expected_return_pct, created_at, archived_at',
    )
    .eq('org_id', orgId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return null;
  return (data || []).filter((p) => p.ticker && !CLOSED_PITCH_STAGES.includes(p.stage));
}

async function snapshotsPart(supabase, orgId) {
  const { data, error } = await supabase
    .from('org_fund_snapshots')
    .select('snapshot_date, total_value')
    .eq('org_id', orgId)
    .order('snapshot_date', { ascending: false })
    .limit(SNAPSHOT_LIMIT);
  if (error) return null;
  return (data || []).map((s) => ({ date: s.snapshot_date, value: s.total_value })).reverse();
}

async function challengesPart(supabase, orgId) {
  try {
    const r = await loadFundChallenges(supabase, orgId);
    if (r.error) return null;
    return { competitions: r.competitions, boards: r.boards };
  } catch {
    return null;
  }
}

export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const [pitches, snapshots, challenges] = await Promise.all([
      pitchesPart(supabase, member.org_id),
      snapshotsPart(supabase, member.org_id),
      challengesPart(supabase, member.org_id),
    ]);
    return NextResponse.json(
      {
        now: Date.now(),
        viewer: { role: member.role, memberId: member.id },
        pitches,
        snapshots,
        challenges,
      },
      { headers: PRIVATE },
    );
  },
  { requireAuth: true },
);
