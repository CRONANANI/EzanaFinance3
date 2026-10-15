/**
 * GET /api/datasets/sanctions/activity?months=6|12|24|0&country=&program=&type=
 *   &dim=program|country|type&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Monthly new OFAC listings by OFAC's own publication date, for the
 * Sanctions Activity Timeline. months=0 is all time. With dim, also returns
 * what the listings in from..to were made of (program and country keys
 * overlap; the page says so). { ready:false } when listing dates are not
 * loaded: the page shows that, never a guessed history.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { validationResponse } from '@/lib/api-errors';
import {
  getSanctionsActivity,
  getSanctionsBreakdown,
  parseActivityParams,
} from '@/lib/sanctions/research';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const rl = await checkRateLimit(`sanctions-activity:${getClientIp(request)}`, {
    limit: 60,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);

  const p = parseActivityParams(new URL(request.url).searchParams);
  if (p.error) return validationResponse(p.error);

  const activity = await getSanctionsActivity(p.months, p.country, p.program, p.type);
  let breakdown = null;
  if (p.dim && p.from && p.to && activity.ready) {
    breakdown = await getSanctionsBreakdown(p.dim, p.from, p.to, p.country, p.program, p.type);
  }
  return NextResponse.json(
    { ...activity, breakdown, months: p.months },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } },
  );
}
