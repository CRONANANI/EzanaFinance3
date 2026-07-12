import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { MANAGER_ROLES, TYPES } from '../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/assignments/templates — reusable templates (any member reads). */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { data, error } = await supabase
      .from('org_assignment_templates')
      .select('id, name, assignment_type, title, instructions, sector, require_upload, created_at')
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      templates: data || [],
      viewer: { canManage: assertOrgRole(member, MANAGER_ROLES) },
    });
  },
  { requireAuth: true },
);

/* POST /api/org/assignments/templates — save a reusable template (manager). */
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
    const name = String(body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Template name required' }, { status: 400 });
    const assignment_type = TYPES.includes(body?.assignment_type) ? body.assignment_type : 'pitch';

    const { data, error } = await supabase
      .from('org_assignment_templates')
      .insert({
        org_id: member.org_id,
        name: name.slice(0, 120),
        assignment_type,
        title: body?.title ? String(body.title).slice(0, 200) : null,
        instructions: body?.instructions ? String(body.instructions).slice(0, 4000) : null,
        sector: body?.sector ? String(body.sector).slice(0, 80) : null,
        require_upload: !!body?.require_upload,
        created_by: member.user_id,
      })
      .select('id, name, assignment_type, title, instructions, sector, require_upload, created_at')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ template: data }, { status: 201 });
  },
  { requireAuth: true },
);
