import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, getAuthUser, isServerSupabaseConfigured } from '@/lib/supabase';
import { validatePassword } from '@/lib/auth/password-rules';
import { defaultSubRole } from '@/lib/org-permissions-config';
import { logOrgAction } from '@/lib/org-audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/*
 * Accepting an org invite link (/auth/org-login?invite=TOKEN).
 *
 * GET  ?token=…  Public. Describes a pending invite: org name, the invited
 *                email, role, team, whether the acceptor may invite others,
 *                and whether an Ezana account already exists for the email.
 * POST {token, fullName?, password?, ageConfirmed?}
 *   - Signed in as the invited email: joins the org.
 *   - Not signed in, no account yet: creates the account with that password,
 *     then joins the org. The 6-digit email check still runs at first
 *     sign-in (profiles.email_verified stays false), because an invite link is
 *     copied and shared by hand and does not prove the email.
 *   - Not signed in, account exists: 409 { needsSignIn: true }.
 * Writes use the service role; every check happens here.
 */

const TOKEN_RE = /^[a-f0-9]{16,128}$/i;
const ROLE_LABEL = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio Manager',
  analyst: 'Analyst',
};

async function loadInvite(service, token) {
  if (!TOKEN_RE.test(token || '')) return { error: 'invalid' };
  const { data: invite } = await service
    .from('org_invites')
    .select(
      'id, org_id, email, role, sub_role, team_id, cohort_id, status, expires_at, can_invite, invited_by',
    )
    .eq('token', token)
    .maybeSingle();
  if (!invite) return { error: 'invalid' };
  if (invite.status === 'accepted') return { error: 'used' };
  if (invite.status !== 'pending') return { error: 'invalid' };
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    await service.from('org_invites').update({ status: 'expired' }).eq('id', invite.id);
    return { error: 'expired' };
  }
  return { invite };
}

const MESSAGES = {
  invalid: 'This invite link is invalid or has been revoked.',
  used: 'This invite has already been used. Sign in to continue.',
  expired: 'This invite link has expired. Ask whoever invited you for a new one.',
};

async function accountExists(service, email) {
  const { data } = await service.from('profiles').select('id').ilike('email', email).limit(1);
  return Boolean(data && data.length);
}

export const GET = withApiGuard(
  async (request) => {
    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ error: 'Invites are unavailable right now.' }, { status: 503 });
    }
    const token = new URL(request.url).searchParams.get('token') || '';
    const service = getAdminClient();
    const { invite, error } = await loadInvite(service, token);
    if (error) return NextResponse.json({ error: MESSAGES[error], code: error }, { status: 410 });

    const [{ data: org }, team] = await Promise.all([
      service
        .from('organizations')
        .select('name, university_name')
        .eq('id', invite.org_id)
        .maybeSingle(),
      invite.team_id
        ? service.from('org_teams').select('name').eq('id', invite.team_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return NextResponse.json({
      invite: {
        email: invite.email,
        orgName: org?.university_name || org?.name || 'your organization',
        role: invite.role,
        roleLabel: ROLE_LABEL[invite.role] || 'Analyst',
        teamName: team?.data?.name || null,
        canInvite: invite.can_invite === true,
        expiresAt: invite.expires_at,
      },
      hasAccount: await accountExists(service, invite.email),
    });
  },
  { requireAuth: false, strict: true },
);

export const POST = withApiGuard(
  async (request) => {
    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ error: 'Invites are unavailable right now.' }, { status: 503 });
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const service = getAdminClient();
    const { invite, error } = await loadInvite(service, String(body?.token || ''));
    if (error) return NextResponse.json({ error: MESSAGES[error], code: error }, { status: 410 });

    const inviteEmail = invite.email.toLowerCase();
    const caller = await getAuthUser(request);
    let userId;
    let displayName = null;

    if (caller) {
      if ((caller.email || '').toLowerCase() !== inviteEmail) {
        return NextResponse.json(
          {
            error: `This invite is for ${invite.email}. Sign out and open the link again.`,
            code: 'wrong_account',
          },
          { status: 403 },
        );
      }
      userId = caller.id;
      displayName = caller.user_metadata?.full_name || null;
    } else {
      if (await accountExists(service, inviteEmail)) {
        return NextResponse.json(
          {
            error: 'You already have an Ezana account. Sign in, then open this link again.',
            needsSignIn: true,
          },
          { status: 409 },
        );
      }
      const fullName = String(body?.fullName || '')
        .trim()
        .slice(0, 120);
      const password = typeof body?.password === 'string' ? body.password : '';
      if (!fullName) {
        return NextResponse.json(
          { error: 'Enter your full name.', field: 'fullName' },
          { status: 400 },
        );
      }
      if (body?.ageConfirmed !== true) {
        return NextResponse.json(
          { error: 'You must be 18 or older to use Ezana.', field: 'ageConfirmed' },
          { status: 400 },
        );
      }
      const pwdErrors = validatePassword(password);
      if (pwdErrors.length) {
        return NextResponse.json(
          { error: `Password must contain: ${pwdErrors.join(', ')}`, field: 'password' },
          { status: 400 },
        );
      }
      const { data: created, error: createErr } = await service.auth.admin.createUser({
        email: inviteEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          age_confirmed: true,
          age_confirmed_at: new Date().toISOString(),
          invited_org: invite.org_id,
        },
      });
      if (createErr || !created?.user?.id) {
        const msg = String(createErr?.message || '');
        if (/already|registered|exists/i.test(msg)) {
          return NextResponse.json(
            {
              error: 'You already have an Ezana account. Sign in, then open this link again.',
              needsSignIn: true,
            },
            { status: 409 },
          );
        }
        return NextResponse.json({ error: 'Could not create the account.' }, { status: 500 });
      }
      userId = created.user.id;
      displayName = fullName;
    }

    // Join (or rejoin) the org with what the invite grants.
    const membership = {
      role: invite.role,
      sub_role: invite.sub_role || defaultSubRole(invite.role),
      team_id: invite.team_id || null,
      cohort_id: invite.cohort_id || null,
      can_invite: invite.can_invite === true,
      is_active: true,
    };
    if (invite.cohort_id) membership.lifecycle_status = 'onboarding';

    const { data: existing } = await service
      .from('org_members')
      .select('id, is_active')
      .eq('org_id', invite.org_id)
      .eq('user_id', userId)
      .maybeSingle();

    let memErr = null;
    if (existing) {
      if (!existing.is_active) {
        ({ error: memErr } = await service
          .from('org_members')
          .update(membership)
          .eq('id', existing.id));
      }
    } else {
      ({ error: memErr } = await service.from('org_members').insert({
        ...membership,
        org_id: invite.org_id,
        user_id: userId,
        display_name: displayName,
        joined_at: new Date().toISOString(),
      }));
    }
    if (memErr) {
      if (!caller) await service.auth.admin.deleteUser(userId).catch(() => {});
      return NextResponse.json({ error: 'Could not join the organization.' }, { status: 500 });
    }

    await service
      .from('org_invites')
      .update({ status: 'accepted', accepted_by: userId, accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    await logOrgAction(service, {
      orgId: invite.org_id,
      actorId: userId,
      action: 'invite_accepted',
      targetType: 'invite',
      targetId: invite.id,
      detail: { role: invite.role, can_invite: invite.can_invite === true, new_account: !caller },
    });

    return NextResponse.json({ ok: true, email: inviteEmail, newAccount: !caller });
  },
  { requireAuth: false, strict: true },
);
