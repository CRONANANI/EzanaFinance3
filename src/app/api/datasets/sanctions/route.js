/**
 * GET /api/datasets/sanctions
 *   ?type=&country=&program=&q=&page=          (unchanged)
 *   &ident=&from=&to=&risk=1&linked=1&linkedTo= (new, Oct 15)
 * One page of active OFAC SDN listings for the Sanctions & Trade Policy
 * page's listings explorer. Name search also matches OFAC aliases; ident
 * matches extracted identifiers; from/to filter OFAC listing dates.
 * Public-domain data, no account needed; rate-limited per address. Inputs
 * are validated against fixed patterns before any query is built.
 * Returns { rows, total, page, pageSize, research }. research=false means
 * the research functions are not installed yet and only the original
 * filters applied.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { validationResponse } from '@/lib/api-errors';
import { getSanctionsPage, parseListingParams } from '@/lib/sanctions/summary';
import { parseSearchParams, searchSanctions } from '@/lib/sanctions/research';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HEADERS = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' };

export async function GET(request) {
  const rl = await checkRateLimit(`sanctions-list:${getClientIp(request)}`, {
    limit: 90,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);

  const sp = new URL(request.url).searchParams;
  const params = parseSearchParams(sp);
  if (params.error) return validationResponse(params.error);

  const result = await searchSanctions(params);
  if (result.research !== false) {
    if (result.error) return NextResponse.json({ error: result.error }, { status: 503 });
    return NextResponse.json(result, { headers: HEADERS });
  }

  /* Research functions not installed: the original listing query. */
  const basic = parseListingParams(sp);
  if (basic.error) return validationResponse(basic.error);
  const page = await getSanctionsPage(basic);
  if (page.error) return NextResponse.json({ error: page.error }, { status: 503 });
  return NextResponse.json({ ...page, research: false }, { headers: HEADERS });
}
