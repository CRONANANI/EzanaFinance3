import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getMember } from '@/lib/disclosures/store';
import { badChamber, resolveChamber } from '../../_guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/disclosures/[chamber]/members/[slug] — one member's profile. */
export const GET = withApiGuard(
  /* withApiGuard calls handler(request, user, context); the route params are
     the THIRD argument, not the second. */
  async (request, _user, ctx) => {
    const { chamber, slug } = await ctx.params;
    const c = resolveChamber(chamber);
    if (!c) return badChamber();
    const member = await getMember(c, slug);
    if (!member) {
      /* Not an error: in the years loaded so far this member may genuinely
         have no filings. The page says so in words. */
      return NextResponse.json({ chamber: c, slug, member: null }, { status: 200 });
    }
    return NextResponse.json({ chamber: c, member });
  },
  { requireAuth: false },
);
