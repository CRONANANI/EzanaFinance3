import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import {
  computeFundPerformance,
  attributionByAnalyst,
  attributionBySector,
  attributionByPitch,
} from '@/lib/org-attribution';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/analytics/fund — fund performance + all three attributions.
   Any active member reads. Optionally caches a daily snapshot for managers. */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const orgId = member.org_id;

    const [performance, byAnalyst, bySector, byPitch] = await Promise.all([
      computeFundPerformance(supabase, orgId),
      attributionByAnalyst(supabase, orgId),
      attributionBySector(supabase, orgId),
      attributionByPitch(supabase, orgId),
    ]);

    // Best-effort daily snapshot cache (managers only; ignore RLS failures).
    if (assertOrgRole(member, ['executive', 'portfolio_manager'])) {
      const { searchParams } = new URL(request.url);
      if (searchParams.get('snapshot') === '1') {
        await supabase
          .from('org_fund_snapshots')
          .upsert(
            {
              org_id: orgId,
              snapshot_date: new Date().toISOString().slice(0, 10),
              total_value: performance.total_value,
              total_cost: performance.total_cost,
              return_pct: performance.return_pct,
              benchmark_return_pct: performance.benchmark_return_pct,
              alpha_pct: performance.alpha_pct,
              attribution: { by_analyst: byAnalyst, by_sector: bySector, by_pitch: byPitch },
            },
            { onConflict: 'org_id,snapshot_date' },
          );
      }
    }

    return NextResponse.json({
      performance,
      attribution: { byAnalyst, bySector, byPitch },
      viewer: {
        memberId: member.id,
        role: member.role,
        canReport: assertOrgRole(member, ['executive', 'portfolio_manager']),
      },
    });
  },
  { requireAuth: true },
);
