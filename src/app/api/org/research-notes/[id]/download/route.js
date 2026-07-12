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

/* POST /api/org/research-notes/[id]/download — increment download_count (export/open-as-file). */
export const POST = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data: note } = await supabase
      .from('org_research_notes')
      .select('id, download_count')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const admin = getAdminClient();
    const next = (note.download_count || 0) + 1;
    const { data, error } = await admin
      .from('org_research_notes')
      .update({ download_count: next })
      .eq('id', id)
      .eq('org_id', member.org_id)
      .select('download_count')
      .single();
    if (error)
      return NextResponse.json({ download_count: note.download_count || 0, counted: false });
    return NextResponse.json({ download_count: data.download_count, counted: true });
  },
  { requireAuth: true },
);
