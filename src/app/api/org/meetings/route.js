import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

/* GET /api/org/meetings — list meetings for the org. */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { data, error } = await supabase
      .from('org_meetings')
      .select('*')
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      meetings: data || [],
      viewer: {
        userId: member.user_id,
        memberId: member.id,
        canRun: assertOrgRole(member, MANAGER_ROLES),
      },
    });
  },
  { requireAuth: true },
);

/* POST /api/org/meetings — create a meeting (manager only). */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const title = (body?.title || '').trim();
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    const agenda = Array.isArray(body?.agenda) ? body.agenda : [];

    const { data, error } = await supabase
      .from('org_meetings')
      .insert({
        org_id: member.org_id,
        title: title.slice(0, 160),
        status: 'scheduled',
        started_by: member.user_id,
        agenda,
        minutes: [],
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ meeting: data });
  },
  { requireAuth: true },
);
