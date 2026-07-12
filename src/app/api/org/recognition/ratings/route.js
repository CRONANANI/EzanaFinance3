import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { mapMemberToWeightRole } from '@/lib/org-rating-engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PERIOD_DAYS = { '30d': 30, qtd: null, ytd: null };

function periodStart(period) {
  const now = new Date();
  if (period === 'qtd') {
    const q = Math.floor(now.getMonth() / 3) * 3;
    return new Date(now.getFullYear(), q, 1);
  }
  if (period === 'ytd') return new Date(now.getFullYear(), 0, 1);
  const days = PERIOD_DAYS[period] ?? 30;
  return new Date(now.getTime() - days * 86400000);
}

// listMode role filters → org_members role + sub_role predicate (weight-role match).
const ROLE_MODE = new Set(['vp', 'pm', 'analyst', 'quant']);
function matchesRoleMode(mode, weightRole) {
  if (mode === 'vp') return weightRole === 'vp';
  if (mode === 'pm') return weightRole === 'portfolio_manager';
  if (mode === 'analyst') return weightRole === 'analyst';
  if (mode === 'quant') return weightRole === 'quant_trader';
  return true;
}

/* GET /api/org/recognition/ratings?listMode=movers|all|vp|pm|analyst|quant&period=30d|qtd|ytd
   - movers → rank by rating GROWTH over period (signed delta from transactions)
   - all / role modes → rank by raw rating (no period). */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const url = new URL(request.url);
    const listMode = (url.searchParams.get('listMode') || 'movers').toLowerCase();
    const period = (url.searchParams.get('period') || '30d').toLowerCase();

    const [{ data: ratings }, { data: members }] = await Promise.all([
      supabase.from('org_member_rating').select('*').eq('org_id', member.org_id),
      supabase
        .from('org_members')
        .select('id, user_id, display_name, role, sub_role')
        .eq('org_id', member.org_id)
        .eq('is_active', true),
    ]);
    const memberById = new Map((members || []).map((m) => [m.id, m]));
    const ratingByMember = new Map((ratings || []).map((r) => [r.member_id, r]));

    // Base rows: one per active member (default to unrated/provisional if no rating row).
    let rows = (members || []).map((m) => {
      const r = ratingByMember.get(m.id);
      const weightRole = mapMemberToWeightRole(m.role, m.sub_role);
      return {
        member_id: m.id,
        user_id: m.user_id,
        name: m.display_name || 'Member',
        role: m.role,
        weight_role: weightRole,
        rating: r ? Number(r.rating) : 1250,
        tier: r ? r.tier : 'unranked',
        rated_thesis_count: r ? r.rated_thesis_count : 0,
        is_provisional: r ? r.is_provisional : true,
        has_rating: !!r,
      };
    });

    if (listMode === 'movers') {
      // Signed delta = sum of transaction deltas in the period.
      const since = periodStart(period).toISOString();
      const { data: tx } = await supabase
        .from('org_rating_transactions')
        .select('member_id, delta, created_at')
        .eq('org_id', member.org_id)
        .gte('created_at', since);
      const deltaByMember = new Map();
      for (const t of tx || []) {
        deltaByMember.set(
          t.member_id,
          (deltaByMember.get(t.member_id) || 0) + Number(t.delta || 0),
        );
      }
      rows = rows
        .map((r) => ({ ...r, delta: Math.round(deltaByMember.get(r.member_id) || 0) }))
        .filter((r) => r.delta !== 0) // only genuine movers
        .sort((a, b) => b.delta - a.delta);
      return NextResponse.json({ listMode, period, rows });
    }

    // all / role modes → raw rating, no period.
    if (ROLE_MODE.has(listMode)) {
      rows = rows.filter((r) => matchesRoleMode(listMode, r.weight_role));
    }
    rows.sort((a, b) => b.rating - a.rating);
    return NextResponse.json({ listMode, rows });
  },
  { requireAuth: true },
);
