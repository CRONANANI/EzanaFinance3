import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';
import {
  getOrgMemberByUserId,
  canManagePositionsServer,
  resolveTeamForOrg,
} from '@/lib/org-positions-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BROKERAGE_SOURCES = new Set(['plaid', 'snaptrade']);

/* POST /api/org/positions/brokerage-connect — import the latest snapshot of a
   caller-owned unified_account (Plaid/SnapTrade) into the team's org_positions. */
export const POST = withApiGuard(
  async (request, user) => {
    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }
    const admin = createServerSupabaseClient();
    const member = await getOrgMemberByUserId(admin, user.id);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!(await canManagePositionsServer(admin, member))) {
      return NextResponse.json({ error: 'manage_positions required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const { team_id, unified_account_id } = body || {};
    if (!unified_account_id) {
      return NextResponse.json({ error: 'unified_account_id required' }, { status: 400 });
    }

    const team = await resolveTeamForOrg(admin, member.org_id, team_id);
    if (team.invalid) {
      return NextResponse.json({ error: 'team_id does not belong to your org' }, { status: 400 });
    }

    // The brokerage account must belong to the caller.
    const { data: account } = await admin
      .from('unified_accounts')
      .select('id, user_id, source_provider')
      .eq('id', unified_account_id)
      .eq('user_id', member.user_id)
      .maybeSingle();
    if (!account) return NextResponse.json({ error: 'account not found' }, { status: 404 });

    const source = BROKERAGE_SOURCES.has(account.source_provider)
      ? account.source_provider
      : null;
    if (!source) {
      return NextResponse.json(
        { error: `Unsupported brokerage source: ${account.source_provider}` },
        { status: 400 },
      );
    }

    // Pull the latest snapshot of positions for this account.
    const { data: positions } = await admin
      .from('unified_positions')
      .select('ticker, name, quantity, avg_cost, price, snapshot_date')
      .eq('account_id', unified_account_id)
      .eq('user_id', member.user_id)
      .order('snapshot_date', { ascending: false })
      .limit(500);

    if (!positions?.length) {
      return NextResponse.json({ inserted: 0, source, message: 'No positions to import' });
    }

    const latestDate = positions[0].snapshot_date;
    const rows = positions
      .filter((p) => p.snapshot_date === latestDate)
      .map((p) => {
        const shares = Number(p.quantity);
        const avgCost = Number(p.avg_cost ?? p.price ?? 0);
        const ticker = String(p.ticker || '').toUpperCase().trim();
        return {
          org_id: member.org_id,
          team_id: team.teamId,
          ticker,
          name: p.name || null,
          shares,
          avg_cost: Number.isFinite(avgCost) && avgCost >= 0 ? avgCost : 0,
          current_price: Number.isFinite(Number(p.price)) ? Number(p.price) : null,
          sector: null,
          source,
          unified_account_id: account.id,
          added_by_user_id: member.user_id,
        };
      })
      // The org_positions CHECK constraints require ticker + shares > 0.
      .filter((row) => row.ticker && Number.isFinite(row.shares) && row.shares > 0);

    if (!rows.length) {
      return NextResponse.json({ inserted: 0, source, message: 'No importable positions found' });
    }

    const { data, error: insErr } = await admin
      .from('org_positions')
      .insert(rows)
      .select('id');
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json({ inserted: data.length, source });
  },
  { requireAuth: true },
);
