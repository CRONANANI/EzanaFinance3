import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getTicker } from '@/lib/disclosures/store';
import { badChamber, resolveChamber } from '../../_guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/disclosures/[chamber]/tickers/[symbol] — who traded one symbol. */
export const GET = withApiGuard(
  /* withApiGuard calls handler(request, user, context); the route params are
     the THIRD argument, not the second. */
  async (request, _user, ctx) => {
    const { chamber, symbol } = await ctx.params;
    const c = resolveChamber(chamber);
    if (!c) return badChamber();
    return NextResponse.json({ chamber: c, ...(await getTicker(c, symbol)) });
  },
  { requireAuth: false },
);
