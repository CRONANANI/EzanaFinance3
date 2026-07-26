import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
// RATIOS ONLY — there is deliberately no dollar/AUM field. ROI and Sharpe are
// dimensionless, so a council competes without revealing how much it runs.
const NUMERIC_FIELDS = ['roi_pct', 'sharpe', 'max_drawdown_pct', 'volatility_pct', 'benchmark_alpha_pct'];

/* GET /api/org/council/fund-metrics — the caller's council fund ratios + standing. */
export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const [{ data: metrics }, { data: elo }] = await Promise.all([
      supabase.from('council_fund_metrics').select('*').eq('org_id', member.org_id).maybeSingle(),
      supabase.from('council_elo').select('current_rating, tier, competition_rating, fund_rating, peak_rating').eq('org_id', member.org_id).maybeSingle(),
    ]);
    return NextResponse.json({ metrics: metrics || null, elo: elo || null, canManage: assertOrgRole(member, MANAGER_ROLES) });
  },
  { requireAuth: true },
);

/* PUT /api/org/council/fund-metrics — managers set their council's fund ratios.
   Never accepts a dollar amount. */
export const PUT = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Only executives and VPs can edit fund metrics.' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const row = { org_id: member.org_id, self_reported: true, updated_at: new Date().toISOString() };
    for (const f of NUMERIC_FIELDS) {
      if (f in body) {
        const n = Number(body[f]);
        row[f] = body[f] === '' || body[f] == null ? null : Number.isFinite(n) ? n : null;
      }
    }
    if ('period_label' in body) row.period_label = body.period_label ? String(body.period_label) : null;

    const { data, error } = await supabase
      .from('council_fund_metrics')
      .upsert(row, { onConflict: 'org_id' })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ metrics: data });
  },
  { requireAuth: true },
);
