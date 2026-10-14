/**
 * GET /api/datasets/sanctions?type=&country=&program=&q=&page=
 * One page of active OFAC SDN listings for the Sanctions & Trade Policy page
 * table. Public-domain data, no account needed; rate-limited per address.
 * Inputs are validated against fixed patterns (type from a closed set,
 * country and program from character allowlists) before any query is built,
 * and name search wildcards are escaped. Errors are generic.
 * Returns { rows, total, page, pageSize }.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { validationResponse } from '@/lib/api-errors';
import { getSanctionsPage, parseListingParams } from '@/lib/sanctions/summary';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const rl = await checkRateLimit(`sanctions-list:${getClientIp(request)}`, {
    limit: 90,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);

  const params = parseListingParams(new URL(request.url).searchParams);
  if (params.error) return validationResponse(params.error);

  const page = await getSanctionsPage(params);
  if (page.error) {
    return NextResponse.json({ error: page.error }, { status: 503 });
  }
  return NextResponse.json(page, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
  });
}
