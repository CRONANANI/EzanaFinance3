import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { MANAGER_ROLES, sanitizeDocType } from '../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/research-notes/templates — faculty-editable doc templates. */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { data, error } = await supabase
      .from('org_research_templates')
      .select('*')
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      templates: data || [],
      canManage: assertOrgRole(member, MANAGER_ROLES),
    });
  },
  { requireAuth: true },
);

/* POST /api/org/research-notes/templates — create a template (managers only). */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json(
        { error: 'Only faculty / PMs can create templates' },
        { status: 403 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const name = (body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Template name required' }, { status: 400 });

    const requiredSections = Array.isArray(body?.required_sections)
      ? body.required_sections
          .map((s) => String(s).trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];

    const { data, error } = await supabase
      .from('org_research_templates')
      .insert({
        org_id: member.org_id,
        name: name.slice(0, 120),
        doc_type: sanitizeDocType(body?.doc_type),
        required_sections: requiredSections,
        body_scaffold: body?.body_scaffold ? String(body.body_scaffold).slice(0, 20000) : null,
        created_by: member.user_id,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ template: data });
  },
  { requireAuth: true },
);
