import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const INDUSTRIES = ['ib', 'pe', 'am', 'consulting', 'other'];
const FINANCE = ['ib', 'pe', 'am', 'consulting'];
const LABELS = {
  ib: 'Investment Banking',
  pe: 'Private Equity',
  am: 'Asset Management',
  consulting: 'Consulting',
  other: 'Other',
  unknown: 'Undisclosed',
};

/* GET /api/org/alumni/placement?cohort_id= — the placement banner data:
   destination counts + "% placed in finance within 6 months". The banner is
   the budget-justification artifact (screenshot / print-to-PDF on the client). */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get('cohort_id');

    let query = supabase
      .from('org_alumni_records')
      .select('employer_industry, placed_within_6mo')
      .eq('org_id', member.org_id);
    if (cohortId) query = query.eq('cohort_id', cohortId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data || [];
    const total = rows.length;

    const byIndustry = {};
    for (const key of [...INDUSTRIES, 'unknown'])
      byIndustry[key] = { key, label: LABELS[key], count: 0 };
    for (const r of rows) {
      const key = INDUSTRIES.includes(r.employer_industry) ? r.employer_industry : 'unknown';
      byIndustry[key].count += 1;
    }

    const placedFinance6mo = rows.filter(
      (r) => r.placed_within_6mo && FINANCE.includes(r.employer_industry),
    ).length;

    return NextResponse.json({
      total,
      destinations: Object.values(byIndustry).filter((d) => d.count > 0 || total === 0),
      placed_finance_6mo: placedFinance6mo,
      placement_rate_pct: total > 0 ? Math.round((placedFinance6mo / total) * 100) : null,
      generated_at: new Date().toISOString(),
    });
  },
  { requireAuth: true },
);
