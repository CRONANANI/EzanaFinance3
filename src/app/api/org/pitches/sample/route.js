/**
 * GET /api/org/pitches/sample   sample content for the Pitch Pipeline
 *
 * { sample: null } for every council member. Master admin and demo accounts
 * (the same check the Community page and the other Team Hub pages use, on
 * the verified session) get the sample bundle from
 * src/lib/org-pitch-pipeline-sample.js. Nothing is read from or written to
 * council records here beyond resolving the caller's own membership, which
 * also keeps non-members out.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { buildPitchPipelineSample } from '@/lib/org-pitch-pipeline-sample';

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
        sample: buildPitchPipelineSample({
          userId: member.user_id,
          memberId: member.id,
          role: member.role,
          tier: member.tier || null,
          displayName: member.display_name,
          title: member.title || member.sub_role || null,
          subRole: member.sub_role || null,
        }),
      },
      { headers: PRIVATE },
    );
  },
  { requireAuth: true },
);
