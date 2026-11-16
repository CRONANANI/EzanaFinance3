/**
 * GET /api/org/council-rankings/sample   sample content for Council Rankings
 *
 * { sample: null } for every council member. Master admin and demo accounts
 * (the same check the Community page and the other rebuilt Team Hub pages
 * use, on the verified session) get the sample bundle from
 * src/lib/org-council-rankings-sample.js, so the page can be presented before
 * councils compete or report. Nothing is read from or written to council
 * records here beyond resolving the caller's own membership, which also keeps
 * non-members and signed-out visitors out.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { buildCouncilRankingsSample } from '@/lib/org-council-rankings-sample';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

export const GET = withApiGuard(
  async (request, user) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!isCommunityDemoViewer(user)) {
      return NextResponse.json({ sample: null }, { headers: PRIVATE });
    }
    const { rows, myOrgId } = buildCouncilRankingsSample();
    return NextResponse.json({ sample: { rows, myOrgId } }, { headers: PRIVATE });
  },
  { requireAuth: true },
);
