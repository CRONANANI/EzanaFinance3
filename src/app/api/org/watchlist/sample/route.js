/**
 * GET /api/org/watchlist/sample   sample content for Council watch on the
 * Watchlist
 *
 * { sample: null } for every council member. Master admin and demo accounts
 * (the same check the Community page and the rebuilt Team Hub pages use, on
 * the verified session) get the sample bundle from
 * src/lib/org-watchlist-sample.js. Nothing is read from or written to council
 * records here beyond resolving the caller's own membership, which also keeps
 * non-members out.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { buildWatchlistSample } from '@/lib/org-watchlist-sample';

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
    return NextResponse.json(
      {
        sample: buildWatchlistSample({
          userId: member.user_id,
          memberId: member.id,
          role: member.role,
          displayName: member.display_name,
          title: member.title,
          subRole: member.sub_role,
        }),
      },
      { headers: PRIVATE },
    );
  },
  { requireAuth: true },
);
