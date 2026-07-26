import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SCOPES = ['none', 'judges_only', 'sponsoring_firms'];
const bad = (msg, status = 400) => NextResponse.json({ error: msg }, { status });

/* A team's own org members manage its roster + each member's recruiting consent.
   Consent is opt-in only, default none, revocable — and every change is audited. */
async function requireTeamOrg(admin, teamId, member) {
  const { data: team } = await admin.from('pitch_teams').select('id, org_id').eq('id', teamId).maybeSingle();
  if (!team) return { notFound: true };
  return { team, isTeamOrg: team.org_id && team.org_id === member.org_id };
}

async function listMembers(admin, teamId) {
  const { data: members } = await admin
    .from('pitch_team_members')
    .select('id, full_name, email, role_on_team')
    .eq('team_id', teamId)
    .order('full_name', { ascending: true });
  const ids = (members || []).map((m) => m.id);
  const { data: optins } = ids.length
    ? await admin.from('pitch_talent_optin').select('pitch_team_member_id, consented, consent_scope, revoked_at').in('pitch_team_member_id', ids)
    : { data: [] };
  const byId = new Map((optins || []).map((o) => [o.pitch_team_member_id, o]));
  return (members || []).map((m) => ({ ...m, optin: byId.get(m.id) || { consented: false, consent_scope: 'none' } }));
}

export const GET = withApiGuard(
  async (_request, _user, context) => {
    const { teamId } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return bad('Not an org member', 403);
    const admin = getAdminClient();
    const { team, isTeamOrg, notFound } = await requireTeamOrg(admin, teamId, member);
    if (notFound) return bad('Team not found', 404);
    if (!isTeamOrg) return bad('Only the team’s own members can view this.', 403);
    return NextResponse.json({ team, members: await listMembers(admin, team.id) });
  },
  { requireAuth: true },
);

export const POST = withApiGuard(
  async (request, _user, context) => {
    const { teamId } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return bad('Not an org member', 403);
    const admin = getAdminClient();
    const { team, isTeamOrg, notFound } = await requireTeamOrg(admin, teamId, member);
    if (notFound) return bad('Team not found', 404);
    if (!isTeamOrg) return bad('Only the team’s own members can manage this.', 403);

    let body;
    try {
      body = await request.json();
    } catch {
      return bad('Invalid JSON');
    }

    if (body.action === 'add') {
      const fullName = String(body?.full_name || '').trim();
      if (!fullName) return bad('full_name is required');
      const { data, error } = await admin
        .from('pitch_team_members')
        .insert({ team_id: team.id, full_name: fullName, email: body?.email || null, role_on_team: body?.role_on_team || null })
        .select('id, full_name, email, role_on_team')
        .single();
      if (error) return bad(error.message, 500);
      return NextResponse.json({ member: { ...data, optin: { consented: false, consent_scope: 'none' } } }, { status: 201 });
    }

    // Ensure the referenced member belongs to this team before any mutation.
    const memberId = body?.member_id;
    if (memberId) {
      const { data: tm } = await admin.from('pitch_team_members').select('id').eq('id', memberId).eq('team_id', team.id).maybeSingle();
      if (!tm) return bad('member not in team');
    }

    if (body.action === 'remove') {
      const { error } = await admin.from('pitch_team_members').delete().eq('id', memberId).eq('team_id', team.id);
      if (error) return bad(error.message, 500);
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'consent') {
      const consented = !!body.consented;
      let scope = SCOPES.includes(body.scope) ? body.scope : 'none';
      if (!consented) scope = 'none'; // withdrawing consent clears scope
      const now = new Date().toISOString();
      const { error } = await admin.from('pitch_talent_optin').upsert(
        {
          pitch_team_member_id: memberId,
          consented,
          consent_scope: scope,
          consented_at: consented ? now : null,
          revoked_at: consented ? null : now,
          updated_at: now,
        },
        { onConflict: 'pitch_team_member_id' },
      );
      if (error) return bad(error.message, 500);
      // Audit every consent change.
      await admin.from('pitch_consent_audit').insert({
        pitch_team_member_id: memberId,
        action: consented ? 'granted' : 'revoked',
        consent_scope: scope,
        actor_org_member_id: member.id,
      });
      return NextResponse.json({ ok: true, optin: { consented, consent_scope: scope } });
    }

    return bad('Unknown action');
  },
  { requireAuth: true },
);
