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

const TICKER_RE = /^[A-Z0-9.\-]{1,12}$/;

/* GET /api/org/positions?team_id=… — list active positions for the caller's org. */
export const GET = withApiGuard(
  async (request, user) => {
    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }
    const admin = createServerSupabaseClient();
    const member = await getOrgMemberByUserId(admin, user.id);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('team_id');

    let q = admin
      .from('org_positions')
      .select('*')
      .eq('org_id', member.org_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (teamId) q = q.eq('team_id', teamId);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ positions: data || [] });
  },
  { requireAuth: true },
);

/* POST /api/org/positions — add a single position by hand (source = 'manual'). */
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

    const { team_id, ticker, name, shares, avg_cost, sector, notes } = body || {};
    const sym = String(ticker || '').toUpperCase().trim();
    const sharesNum = Number(shares);
    const costNum = Number(avg_cost);

    if (!TICKER_RE.test(sym)) {
      return NextResponse.json({ error: 'A valid ticker is required' }, { status: 400 });
    }
    if (!Number.isFinite(sharesNum) || sharesNum <= 0) {
      return NextResponse.json({ error: 'Shares must be a number greater than 0' }, { status: 400 });
    }
    if (!Number.isFinite(costNum) || costNum < 0) {
      return NextResponse.json({ error: 'Average cost must be 0 or greater' }, { status: 400 });
    }

    const team = await resolveTeamForOrg(admin, member.org_id, team_id);
    if (team.invalid) {
      return NextResponse.json({ error: 'team_id does not belong to your org' }, { status: 400 });
    }

    const { data, error } = await admin
      .from('org_positions')
      .insert({
        org_id: member.org_id,
        team_id: team.teamId,
        ticker: sym,
        name: name ? String(name).slice(0, 200) : null,
        shares: sharesNum,
        avg_cost: costNum,
        sector: sector ? String(sector).slice(0, 100) : null,
        notes: notes ? String(notes).slice(0, 2000) : null,
        source: 'manual',
        added_by_user_id: member.user_id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ position: data });
  },
  { requireAuth: true },
);

/* DELETE /api/org/positions?id=… — soft-archive a position (is_active = false).
   Kept on the collection route (rather than a [id] segment) because the sibling
   dynamic segment is already named [ticker] and Next.js forbids two slug names
   at the same path. */
export const DELETE = withApiGuard(
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data: position } = await admin
      .from('org_positions')
      .select('id, org_id')
      .eq('id', id)
      .maybeSingle();
    if (!position || position.org_id !== member.org_id) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    const { error } = await admin
      .from('org_positions')
      .update({ is_active: false })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
