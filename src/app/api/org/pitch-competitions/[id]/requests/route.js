import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { canManageCompetition } from '@/lib/competitions/permissions';
import { loadJoinRequests } from '@/lib/competitions/onboarding';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function loadCompMeta(supabase, id) {
  const { data } = await supabase.from('pitch_competitions').select('id, host_org_id').eq('id', id).maybeSingle();
  return data || null;
}

/* GET /api/org/pitch-competitions/:id/requests — join requests (RLS scopes: host
   managers see all; a requesting org sees its own). */
export const GET = withApiGuard(
  async (_request, _user, context) => {
    const { id } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const comp = await loadCompMeta(supabase, id);
    if (!comp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const requests = await loadJoinRequests(supabase, comp.id);
    return NextResponse.json({ requests, canManage: canManageCompetition(member, comp) });
  },
  { requireAuth: true },
);

/* POST /api/org/pitch-competitions/:id/requests — host managers decide a request.
   Approving provisions the pitch_teams row (status 'registered'). RLS enforces the
   host-manager gate on both the request update and the team insert. */
export const POST = withApiGuard(
  async (request, _user, context) => {
    const { id } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const comp = await loadCompMeta(supabase, id);
    if (!comp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canManageCompetition(member, comp)) {
      return NextResponse.json({ error: 'Only host executives and VPs can decide requests.' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const decision = body?.decision;
    if (!['approved', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'decision must be approved or rejected' }, { status: 400 });
    }

    const { data: reqRow } = await supabase
      .from('pitch_join_requests')
      .select('id, competition_id, org_id, team_name, contact_email, status')
      .eq('id', body.request_id)
      .eq('competition_id', comp.id)
      .maybeSingle();
    if (!reqRow) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (reqRow.status !== 'pending') return NextResponse.json({ error: 'Request already decided' }, { status: 409 });

    const { error: updErr } = await supabase
      .from('pitch_join_requests')
      .update({
        status: decision,
        decided_by: member.id,
        decided_at: new Date().toISOString(),
        decision_note: body?.decision_note || null,
      })
      .eq('id', reqRow.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    let team = null;
    if (decision === 'approved') {
      const { data, error } = await supabase
        .from('pitch_teams')
        .insert({
          competition_id: comp.id,
          org_id: reqRow.org_id,
          team_name: reqRow.team_name,
          invite_email: reqRow.contact_email,
          status: 'registered',
        })
        .select('id, team_name, status')
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      team = data;
    }

    return NextResponse.json({ ok: true, decision, team });
  },
  { requireAuth: true },
);
