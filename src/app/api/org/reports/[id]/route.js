import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { reportViewer } from '@/lib/org-reports-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* DELETE /api/org/reports/:id: delete a saved report for the whole council.
   The same members who may generate and open reports (role and the advisor's
   export setting); RLS ("managers write reports") still decides the write.
   Another council's report, or none, is "not found". */
export const DELETE = withApiGuard(
  async (request, user, context) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const viewer = await reportViewer(supabase, member);
    if (!viewer.canExport) {
      return NextResponse.json({ error: 'Manager / advisor role required' }, { status: 403 });
    }
    const { id } = (await context?.params) || {};
    if (!id) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    const { data, error } = await supabase
      .from('org_reports')
      .delete()
      .eq('id', id)
      .eq('org_id', member.org_id)
      .select('id');
    if (error) return NextResponse.json({ error: 'Could not delete the report' }, { status: 500 });
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  },
  { requireAuth: true },
);
