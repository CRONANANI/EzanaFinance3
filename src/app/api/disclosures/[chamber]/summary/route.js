import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getSummary } from '@/lib/disclosures/store';
import { badChamber, resolveChamber, searchOf } from '../_guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/disclosures/[chamber]/summary — the metric row's four figures,
   plus the count of PTRs still awaiting extraction, which is what the pending
   state reports. Public read, rate-limited. */
export const GET = withApiGuard(
  /* withApiGuard calls handler(request, user, context); the route params are
     the THIRD argument, not the second. */
  async (request, _user, ctx) => {
    const { chamber } = await ctx.params;
    const c = resolveChamber(chamber);
    if (!c) return badChamber();
    const year = searchOf(request).get('year');
    return NextResponse.json({ chamber: c, ...(await getSummary(c, { year })) });
  },
  { requireAuth: false },
);
