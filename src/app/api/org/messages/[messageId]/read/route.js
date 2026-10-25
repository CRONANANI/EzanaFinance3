import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getOrgMemberForUser } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';

export const PATCH = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const supabase = getUserClient();
    // Multi-org safe (QA ORG-9): a message may sit in any org the caller
    // belongs to, so match against every active membership id.
    const member = await getOrgMemberForUser(supabase, user.id, { select: 'id, org_id' });
    if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const myMemberIds = member.memberships.map((m) => m.id);

    const messageId = params.messageId;
    const { data, error } = await supabase
      .from('org_direct_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId)
      .in('recipient_member_id', myMemberIds)
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ message: data });
  },
  { requireAuth: true },
);
