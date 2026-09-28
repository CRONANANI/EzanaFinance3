import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getCoverage } from '@/lib/disclosures/store';
import { badChamber, resolveChamber } from '../_guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/disclosures/[chamber]/coverage — per-year counts as published by
   the source, so a thin year reads as a thin year rather than a gap. */
export const GET = withApiGuard(
  /* withApiGuard calls handler(request, user, context); the route params are
     the THIRD argument, not the second. */
  async (request, _user, ctx) => {
    const { chamber } = await ctx.params;
    const c = resolveChamber(chamber);
    if (!c) return badChamber();
    return NextResponse.json({ chamber: c, ...(await getCoverage(c)) });
  },
  { requireAuth: false },
);
