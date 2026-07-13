import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getPitchContext, loadPitchBoard } from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiGuard(
  async (request) => {
    const { supabase, orgId } = await getPitchContext();
    if (!orgId) {
      return NextResponse.json({ view: 'kanban', columns: [], archive: [], total_active: 0 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'kanban';
    const teamId = searchParams.get('team_id') || undefined;

    const payload = await loadPitchBoard(supabase, orgId, { view, teamId });
    return NextResponse.json(payload);
  },
  { requireAuth: true },
);
