import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { getPitchBoard, resolveViewerMember } from '@/lib/org-pitches';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    const viewer = resolveViewerMember(member?.email, member?.role);

    const { searchParams } = new URL(request.url);
    const team_id = searchParams.get('team_id') || undefined;

    const board = getPitchBoard({ viewer, team_id });
    return NextResponse.json(board);
  },
  { requireAuth: true },
);
