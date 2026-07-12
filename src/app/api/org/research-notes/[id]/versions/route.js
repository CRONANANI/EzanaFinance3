import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* GET /api/org/research-notes/[id]/versions — real edit history (newest first). */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    // RLS on org_research_versions gates read by parent-note readability.
    const { data, error } = await supabase
      .from('org_research_versions')
      .select('id, version, title, abstract, edited_by, created_at')
      .eq('note_id', id)
      .order('version', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const editorIds = [...new Set((data || []).map((v) => v.edited_by).filter(Boolean))];
    let nameBy = new Map();
    if (editorIds.length) {
      const { data: mem } = await supabase
        .from('org_members')
        .select('user_id, display_name')
        .eq('org_id', member.org_id)
        .in('user_id', editorIds);
      nameBy = new Map((mem || []).map((m) => [m.user_id, m.display_name || 'Member']));
    }

    const versions = (data || []).map((v) => ({
      ...v,
      editor_name: nameBy.get(v.edited_by) || 'Member',
    }));
    return NextResponse.json({ versions });
  },
  { requireAuth: true },
);
