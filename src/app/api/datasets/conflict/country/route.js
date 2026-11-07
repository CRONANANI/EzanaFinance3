/**
 * GET /api/datasets/conflict/country?iso3=SDN
 * One country's UCDP conflict picture for the Armed Conflict Tracker's country panel:
 * monthly series by type, KPIs, deadliest conflicts, most active parties, latest events.
 * Public data (CC BY 4.0), rate-limited per address. 404 when the country has no events.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { validationResponse } from '@/lib/api-errors';
import { getConflictCountry, normIso3 } from '@/lib/ucdp/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HEADERS = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=21600' };

export async function GET(request) {
  const rl = await checkRateLimit(`conflict-country:${getClientIp(request)}`, {
    limit: 90,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);
  const iso3 = normIso3(new URL(request.url).searchParams.get('iso3'));
  if (!iso3) return validationResponse('iso3 must be a three-letter country code');
  const data = await getConflictCountry(iso3);
  if (!data)
    return NextResponse.json({ error: 'No recorded events for this country.' }, { status: 404 });
  return NextResponse.json(data, { headers: HEADERS });
}
