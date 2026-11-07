/**
 * GET /api/datasets/conflict/map?months=3|12|36&type=all|1|2|3
 * UCDP events binned to a 1 degree grid for the Armed Conflict Tracker map. Public data
 * (CC BY 4.0), no account needed, rate-limited per address, inputs validated.
 * Returns { asof, months, type, cells: [[lat, lon, best, events, sb, ns, os, iso3], ...] }.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { validationResponse } from '@/lib/api-errors';
import { getConflictMap, parseMapParams } from '@/lib/ucdp/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HEADERS = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=21600' };

export async function GET(request) {
  const rl = await checkRateLimit(`conflict-map:${getClientIp(request)}`, {
    limit: 60,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);
  const p = parseMapParams(new URL(request.url).searchParams);
  if (p.error) return validationResponse(p.error);
  const data = await getConflictMap(p.months, p.type);
  if (!data)
    return NextResponse.json({ error: 'Conflict data is not available yet.' }, { status: 503 });
  return NextResponse.json(data, { headers: HEADERS });
}
