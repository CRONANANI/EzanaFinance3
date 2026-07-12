import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* POST /api/org/research-notes/[id]/view — increment view_count (read-tracking). */
export const POST = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    // RLS-checked read: proves the caller may actually see this doc.
    const { data: note } = await supabase
      .from('org_research_notes')
      .select('id, author_id, view_count')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Don't inflate on the author's own opens.
    if (note.author_id === member.user_id) {
      return NextResponse.json({ view_count: note.view_count || 0, counted: false });
    }

    // Counter isn't sensitive; increment via service role so any authorised
    // reader counts (note-update RLS otherwise blocks non-manager viewers).
    const admin = getAdminClient();
    const next = (note.view_count || 0) + 1;
    const { data, error } = await admin
      .from('org_research_notes')
      .update({ view_count: next })
      .eq('id', id)
      .eq('org_id', member.org_id)
      .select('view_count')
      .single();
    if (error) return NextResponse.json({ view_count: note.view_count || 0, counted: false });
    return NextResponse.json({ view_count: data.view_count, counted: true });
  },
  { requireAuth: true },
);
