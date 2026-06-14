import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/audit-log — recent privileged actions (executive only).
   Optional filters: ?action=&limit=&offset=. */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, ['executive'])) {
      return NextResponse.json({ error: 'Executive role required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const limit = Math.min(200, Math.max(1, Number.parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, Number.parseInt(searchParams.get('offset') || '0', 10));

    let query = supabase
      .from('org_audit_log')
      .select('id, actor_id, action, target_type, target_id, detail, created_at')
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (action) query = query.eq('action', action);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: members } = await supabase
      .from('org_members')
      .select('user_id, display_name')
      .eq('org_id', member.org_id);
    const nameByUser = new Map((members || []).map((m) => [m.user_id, m.display_name]));

    const { data: actions } = await supabase
      .from('org_audit_log')
      .select('action')
      .eq('org_id', member.org_id)
      .limit(1000);
    const actionTypes = [...new Set((actions || []).map((a) => a.action))].sort();

    return NextResponse.json({
      entries: (data || []).map((e) => ({
        ...e,
        actor_name: e.actor_id ? nameByUser.get(e.actor_id) || 'Member' : 'System',
      })),
      actionTypes,
      hasMore: (data || []).length === limit,
    });
  },
  { requireAuth: true },
);
