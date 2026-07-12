import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { BOARD_STAGES } from '../ats-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RANK = { applied: 0, screened: 1, interview: 2, pitch: 3, offer: 4, accepted: 5 };

/* GET /api/org/applicants/funnel?cohort_id= — Applied→Accepted conversion plus
   a by-source breakdown. Reached-stage counts are derived from each applicant's
   CURRENT stage (there is no stage-history table yet — rejected/declined count
   only as "applied", which is the honest floor). */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get('cohort_id');
    if (!cohortId) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });

    const { data: applicants, error } = await supabase
      .from('org_applicants')
      .select('stage, source')
      .eq('org_id', member.org_id)
      .eq('cohort_id', cohortId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = applicants || [];
    const total = rows.length;
    const accepted = rows.filter((r) => r.stage === 'accepted').length;

    const funnel = BOARD_STAGES.map((stage) => {
      const rank = RANK[stage];
      const count = rows.filter((r) => (RANK[r.stage] ?? 0) >= rank).length;
      return {
        stage,
        count,
        conversion_pct: total > 0 ? Math.round((count / total) * 100) : null,
      };
    });

    const bySource = new Map();
    for (const r of rows) {
      const key = r.source || 'Unknown';
      if (!bySource.has(key)) bySource.set(key, { total: 0, accepted: 0 });
      const s = bySource.get(key);
      s.total += 1;
      if (r.stage === 'accepted') s.accepted += 1;
    }
    const sources = [...bySource.entries()]
      .map(([source, v]) => ({
        source,
        total: v.total,
        accepted: v.accepted,
        conversion_pct: v.total > 0 ? Math.round((v.accepted / v.total) * 100) : null,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      funnel,
      total,
      accepted,
      conversion_pct: total > 0 ? Math.round((accepted / total) * 100) : null,
      sources,
    });
  },
  { requireAuth: true },
);
