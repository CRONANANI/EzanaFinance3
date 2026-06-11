import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* GET /api/org/competitions/:id/leaderboard — cross-university standings. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data: comp } = await supabase
      .from('competitions')
      .select('id, name, description, status, starts_at, ends_at')
      .eq('id', id)
      .maybeSingle();
    if (!comp) return NextResponse.json({ error: 'Competition not found' }, { status: 404 });

    const { data: entries, error } = await supabase
      .from('competition_org_entries')
      .select('org_id, current_value, return_pct, rank, status')
      .eq('competition_id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Org names for each entry (organizations are public-readable).
    const orgIds = [...new Set((entries || []).map((e) => e.org_id))];
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, university_name, name')
      .in('id', orgIds.length ? orgIds : ['00000000-0000-0000-0000-000000000000']);
    const nameByOrg = new Map(
      (orgs || []).map((o) => [o.id, o.university_name || o.name || 'University']),
    );

    // Rank by return_pct desc, falling back to current_value.
    const ranked = (entries || [])
      .map((e) => ({
        org_id: e.org_id,
        university: nameByOrg.get(e.org_id) || 'University',
        current_value: e.current_value == null ? null : Number(e.current_value),
        return_pct: e.return_pct == null ? null : Number(e.return_pct),
        status: e.status,
        isMine: e.org_id === member.org_id,
      }))
      .sort((a, b) => {
        const ra = a.return_pct ?? -Infinity;
        const rb = b.return_pct ?? -Infinity;
        if (rb !== ra) return rb - ra;
        return (b.current_value ?? 0) - (a.current_value ?? 0);
      })
      .map((e, i) => ({ ...e, rank: i + 1 }));

    return NextResponse.json({ competition: comp, standings: ranked, myOrgId: member.org_id });
  },
  { requireAuth: true },
);
