import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';

import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* DELETE /api/org/invites/:inviteId: revoke a pending invite. Executives
   revoke any; a delegated inviter (org_members.can_invite) only their own. */
export const DELETE = withApiGuard(
  async (request, user, context) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const isExec = assertOrgRole(member, ['executive']);
    if (!isExec && member.can_invite !== true) {
      return NextResponse.json({ error: 'You do not have permission to revoke' }, { status: 403 });
    }
    const { inviteId } = await resolveParams(context);
    if (!inviteId) return NextResponse.json({ error: 'Invite id required' }, { status: 400 });

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }
    const service = getAdminClient();
    let q = service
      .from('org_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId)
      .eq('org_id', member.org_id)
      .eq('status', 'pending');
    if (!isExec) q = q.eq('invited_by', member.user_id);
    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
