import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { MANAGER_ROLES } from '../../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/*
 * POST /api/org/research-notes/[id]/supersede  { successor_id }
 * Marks the OLD doc superseded and points superseded_by → successor. The old
 * doc stays readable (never deleted, never hidden) — the UI badges it.
 */
export const POST = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const successorId = body?.successor_id || null;

    const { data: note } = await supabase
      .from('org_research_notes')
      .select('id, author_id, org_id')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isAuthor = note.author_id === member.user_id;
    if (!isAuthor && !assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    // Validate the successor belongs to the same org (if provided).
    if (successorId) {
      const { data: succ } = await supabase
        .from('org_research_notes')
        .select('id')
        .eq('id', successorId)
        .eq('org_id', member.org_id)
        .maybeSingle();
      if (!succ) return NextResponse.json({ error: 'Successor doc not found' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('org_research_notes')
      .update({
        status: 'superseded',
        superseded_by: successorId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, status, superseded_by')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ note: data });
  },
  { requireAuth: true },
);
