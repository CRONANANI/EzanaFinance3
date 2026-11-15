/**
 * GET /api/org/team-hub/sample   sample content for the Command Center
 *
 * { sample: null } for every council member. Master admin and demo accounts
 * (the same check the Community page uses, on the verified session) get the
 * sample bundle from src/lib/org-command-center-sample.js, so the page can be
 * presented from a council with little activity. Nothing is read from or
 * written to council records here beyond resolving the caller's own
 * membership, which also keeps non-members out.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { buildCommandCenterSample } from '@/lib/org-command-center-sample';

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
        sample: buildCommandCenterSample({
          userId: member.user_id,
          role: member.role,
          displayName: member.display_name,
          title: member.title || member.sub_role || null,
          teamId: member.team_id || null,
        }),
      },
      { headers: PRIVATE },
    );
  },
  { requireAuth: true },
);
