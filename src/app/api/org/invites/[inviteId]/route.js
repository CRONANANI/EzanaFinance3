import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* DELETE /api/org/invites/:inviteId — revoke a pending invite (executive only). */
export const DELETE = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, ['executive'])) {
      return NextResponse.json({ error: 'Executive role required' }, { status: 403 });
    }
    const { inviteId } = await resolveParams(context);
    if (!inviteId) return NextResponse.json({ error: 'Invite id required' }, { status: 400 });

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }
    const service = createServerSupabaseClient();
    const { error } = await service
      .from('org_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId)
      .eq('org_id', member.org_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
