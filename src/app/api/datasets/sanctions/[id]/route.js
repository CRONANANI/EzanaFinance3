/**
 * GET /api/datasets/sanctions/:id
 * One OFAC SDN record with everything the page holds on it: the listing,
 * OFAC's listing date, aliases, identifiers extracted from the remarks,
 * "Linked To" notes resolved against the list, records that name it, the
 * original remarks and provenance timestamps. Public-domain data; rate
 * limited per address.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { validationResponse } from '@/lib/api-errors';
import { getSanctionsRecord } from '@/lib/sanctions/research';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const rl = await checkRateLimit(`sanctions-record:${getClientIp(request)}`, {
    limit: 120,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);

  const id = Number(params?.id);
  if (!Number.isInteger(id) || id < 1 || id > 10_000_000)
    return validationResponse('Bad record id.');

  const record = await getSanctionsRecord(id);
  if (!record)
    return NextResponse.json({ error: 'The record could not be loaded.' }, { status: 503 });
  if (record.notFound) return NextResponse.json({ error: 'No such record.' }, { status: 404 });
  return NextResponse.json(record, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' },
  });
}
