import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getTrades } from '@/lib/disclosures/store';
import { badChamber, resolveChamber, searchOf } from '../_guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/disclosures/[chamber]/trades — paged, filtered, sorted.
   Sorting by amount orders on the bracket midpoint server-side and sets
   amountEstimated so the UI can mark the column; the midpoint itself is never
   returned. */
export const GET = withApiGuard(
  /* withApiGuard calls handler(request, user, context); the route params are
     the THIRD argument, not the second. */
  async (request, _user, ctx) => {
    const { chamber } = await ctx.params;
    const c = resolveChamber(chamber);
    if (!c) return badChamber();
    const s = searchOf(request);
    const result = await getTrades(c, {
      year: s.get('year'),
      type: s.get('type'),
      bracket: s.get('bracket'),
      lag: s.get('lag'),
      member: s.get('member'),
      ticker: s.get('ticker'),
      sort: s.get('sort') || 'filed',
      page: s.get('page'),
      limit: s.get('limit'),
    });
    return NextResponse.json({ chamber: c, ...result });
  },
  { requireAuth: false },
);
