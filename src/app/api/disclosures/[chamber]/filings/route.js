import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getFilings } from '@/lib/disclosures/store';
import { badChamber, resolveChamber, searchOf } from '../_guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/disclosures/[chamber]/filings — the filing index, paged. */
export const GET = withApiGuard(
  /* withApiGuard calls handler(request, user, context); the route params are
     the THIRD argument, not the second. */
  async (request, _user, ctx) => {
    const { chamber } = await ctx.params;
    const c = resolveChamber(chamber);
    if (!c) return badChamber();
    const s = searchOf(request);
    const result = await getFilings(c, {
      year: s.get('year'),
      type: s.get('type'),
      member: s.get('member'),
      page: s.get('page'),
      limit: s.get('limit'),
    });
    return NextResponse.json({ chamber: c, ...result });
  },
  { requireAuth: false },
);
