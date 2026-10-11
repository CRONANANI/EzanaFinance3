import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';

import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { logOrgAction } from '@/lib/org-audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROLES = ['executive', 'portfolio_manager', 'analyst'];
const INVITE_COLS =
  'id, email, role, sub_role, team_id, cohort_id, token, status, created_at, expires_at, can_invite, invited_by';

/* Executives manage every invite. A member whose invite granted can_invite
   may create invites for non-executive roles and sees only their own. Only
   executives can pass the invite right on. */
function inviterScope(member) {
  if (assertOrgRole(member, ['executive'])) return 'all';
  if (member?.is_active && member?.can_invite === true) return 'own';
  return null;
}

/* GET /api/org/invites: invites for the caller's org: all of them for an
   executive, the caller's own for a delegated inviter. */
export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const scope = inviterScope(member);
    if (!scope) {
      return NextResponse.json({ error: 'You do not have permission to invite' }, { status: 403 });
    }
    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ error: 'Server not configured for invites' }, { status: 503 });
    }
    // Service role: delegated inviters are not executives, so RLS would hide
    // the table from them. The org and inviter filters below do the scoping.
    const service = getAdminClient();

    const { data: org } = await service
      .from('organizations')
      .select('email_domain')
      .eq('id', member.org_id)
      .maybeSingle();

    let q = service
      .from('org_invites')
      .select(INVITE_COLS)
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (scope === 'own') q = q.eq('invited_by', member.user_id);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      invites: data || [],
      emailDomain: org?.email_domain || null,
      canGrantInvite: scope === 'all',
    });
  },
  { requireAuth: true },
);

/* POST /api/org/invites: create an invite. Executives, or members granted
   can_invite (non-executive roles only, and they cannot pass the right on).
   Enforces the org's email domain. Returns a copyable invite link (no
   transactional email wired). */
export const POST = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const scope = inviterScope(member);
    if (!scope) {
      return NextResponse.json({ error: 'You do not have permission to invite' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const email = String(body?.email || '')
      .trim()
      .toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    const role = ROLES.includes(body?.role) ? body.role : 'analyst';
    if (scope === 'own' && role === 'executive') {
      return NextResponse.json({ error: 'Only executives can invite executives' }, { status: 403 });
    }
    const canInvite = scope === 'all' && body?.can_invite === true;

    const { data: org } = await getAdminClient()
      .from('organizations')
      .select('email_domain')
      .eq('id', member.org_id)
      .maybeSingle();
    const domain = (org?.email_domain || '').toLowerCase();
    if (domain && !email.endsWith(`@${domain}`)) {
      return NextResponse.json({ error: `Email must end in @${domain}` }, { status: 400 });
    }

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ error: 'Server not configured for invites' }, { status: 503 });
    }
    const service = getAdminClient();
    const { data: invite, error } = await service
      .from('org_invites')
      .insert({
        org_id: member.org_id,
        email,
        role,
        sub_role: body?.sub_role || null,
        team_id: body?.team_id || null,
        cohort_id: body?.cohort_id || null,
        status: 'pending',
        invited_by: member.user_id,
        can_invite: canInvite,
      })
      .select(INVITE_COLS)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logOrgAction(service, {
      orgId: member.org_id,
      actorId: member.user_id,
      action: 'member_invited',
      targetType: 'invite',
      targetId: invite.id,
      detail: { email, role, can_invite: canInvite },
    });

    return NextResponse.json({ invite }, { status: 201 });
  },
  { requireAuth: true },
);
