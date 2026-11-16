import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getPitchContext, loadPitchBoard } from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/org/pitches/board
 * Everything the Pitch Pipeline page draws: every pitch with its current
 * stage's gates and what this member may do, the committee meetings and the
 * roster. A pitch in an open blind vote carries only the number of ballots
 * received.
 */
export const GET = withApiGuard(
  async (request) => {
    const { supabase, viewer, orgId } = await getPitchContext();
    if (!orgId || !viewer) {
      return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('team_id') || undefined;
    const payload = await loadPitchBoard(supabase, orgId, { viewer, teamId });
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-store' } });
  },
  { requireAuth: true },
);
