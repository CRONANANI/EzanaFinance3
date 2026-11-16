import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadChallengeStandings } from '@/lib/competitions/fund-challenges';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* GET /api/org/competitions/:id/leaderboard: cross-university standings, ranked by
   return since entry. Never carries a council's fund value in dollars. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data: comp } = await supabase
      .from('competitions')
      .select('id, name, description, status, starts_at, ends_at')
      .eq('id', id)
      .maybeSingle();
    if (!comp) return NextResponse.json({ error: 'Competition not found' }, { status: 404 });

    // Ranked by return since entry. No fund value in dollars is ever returned.
    const { error, standings } = await loadChallengeStandings(supabase, id, member.org_id);
    if (error) return NextResponse.json({ error: 'Could not load standings' }, { status: 500 });

    return NextResponse.json({ competition: comp, standings, myOrgId: member.org_id });
  },
  { requireAuth: true },
);
