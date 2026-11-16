/**
 * GET /api/org/research-notes/sample   sample content for the Research Library
 *
 * { sample: null } for every council member. Master admin and demo accounts
 * (the same check the Community page and the other rebuilt org pages use, on
 * the verified session) get the sample bundle from
 * src/lib/org-research-library-sample.js, so the page can be presented from a
 * council with few documents. Nothing is read from or written to council
 * records here beyond resolving the caller's own membership, which also keeps
 * non-members out.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { buildResearchLibrarySample } from '@/lib/org-research-library-sample';

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
        sample: buildResearchLibrarySample({
          userId: member.user_id,
          memberId: member.id,
          role: member.role,
          displayName: member.display_name,
          subRole: member.sub_role || null,
          tier: member.tier || null,
        }),
      },
      { headers: PRIVATE },
    );
  },
  { requireAuth: true },
);
