/**
 * GET /api/datasets/capitol/company?ticker=AMZN[&part=card|prices|news][&range=1Y]
 * The Capitol Watch company card, in three parts so each section paints as
 * soon as its own data arrives:
 *   card    name, sector, 10 fiscal years of federal contracts, recent awards,
 *           members with the largest estimated positions, their purchases
 *   prices  daily closes for the range (1M, 6M, 1Y, 5Y, 10Y)
 *   news    recent company headlines
 * Public data; rate-limited per address; cached at the edge.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { validationResponse } from '@/lib/api-errors';
import {
  PRICE_RANGES,
  getCapitolCompany,
  getCapitolCompanyNews,
  getCapitolCompanyPrices,
} from '@/lib/datasets/capitol-hub/company';

export const dynamic = 'force-dynamic';

const TICKER = /^[A-Z][A-Z0-9.-]{0,9}$/;
const EDGE = {
  card: 'public, s-maxage=900, stale-while-revalidate=3600',
  prices: 'public, s-maxage=3600, stale-while-revalidate=86400',
  news: 'public, s-maxage=1800, stale-while-revalidate=3600',
};

export async function GET(request) {
  const rl = await checkRateLimit(`capitol-company:${getClientIp(request)}`, {
    limit: 120,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);
  const sp = new URL(request.url).searchParams;
  const ticker = String(sp.get('ticker') || '')
    .trim()
    .toUpperCase();
  if (!TICKER.test(ticker)) return validationResponse('A ticker is required.');
  const part = ['prices', 'news'].includes(sp.get('part')) ? sp.get('part') : 'card';
  const range = PRICE_RANGES[sp.get('range')] ? sp.get('range') : '1Y';

  const out =
    part === 'prices'
      ? await getCapitolCompanyPrices(ticker, range)
      : part === 'news'
        ? await getCapitolCompanyNews(ticker)
        : await getCapitolCompany(ticker);

  if (out?.error) {
    return NextResponse.json(
      { ok: false, error: 'This company could not be loaded just now.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return NextResponse.json({ ok: true, ...out }, { headers: { 'Cache-Control': EDGE[part] } });
}
