import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadTeamHubSummary } from './_loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/team-hub/summary — one round-trip for the Team Hub home page:
   fund performance, sector desk (per-team sleeves ranked by ROI), hero stat
   strip (cohort / my assignments / IPS violations), member+team+task counts,
   fund-value snapshots for the hero chart, and the organization card.

   The read + shaping lives in `_loader.js` so server pages (e.g. the Org Chart
   page) can seed the same payload for first paint without a client round-trip. */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const payload = await loadTeamHubSummary(supabase, member);
    return NextResponse.json(payload);
  },
  { requireAuth: true },
);
