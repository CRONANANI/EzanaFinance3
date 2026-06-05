import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { getArchivedPitches, resolveViewerMember } from '@/lib/org-pitches';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    const viewer = resolveViewerMember(member?.email, member?.role);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || searchParams.get('q') || '';
    const decision = searchParams.get('decision') || undefined;
    const team_id = searchParams.get('team_id') || undefined;
    const analyst_id = searchParams.get('analyst_id') || undefined;
    const sort = searchParams.get('sort') || 'recent';

    const all = getArchivedPitches({
      viewer,
      search,
      decision,
      team_id,
      analyst_id,
      sort,
    });

    return NextResponse.json({
      pitches: all,
      total: all.length,
      showing: all.length,
    });
  },
  { requireAuth: true },
);
