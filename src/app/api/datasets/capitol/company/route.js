/**
 * GET /api/datasets/capitol/company?ticker=LMT&part=card|prices|news[&range=1Y]
 * The Capitol Watch company card, in three parts the card requests in
 * parallel so each section paints when its own data lands:
 *   card    ten years of federal contracts, largest and latest awards, and
 *           the sitting members with the largest estimated positions
 *   prices  daily closes for 1M, 6M, 1Y, 5Y or 10Y
 *   news    the last 30 days of headlines
 * Public records and public market data; rate-limited per address.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { validationResponse } from '@/lib/api-errors';
import {
  RANGES,
  TICKER,
  getCompanyCard,
  getCompanyNews,
  getCompanyPrices,
} from '@/lib/datasets/capitol-hub/company';

export const dynamic = 'force-dynamic';

const CACHE = {
  card: 'public, s-maxage=900, stale-while-revalidate=3600',
  prices: 'public, s-maxage=3600, stale-while-revalidate=21600',
  news: 'public, s-maxage=1800, stale-while-revalidate=7200',
};

export async function GET(request) {
  /* Hover prefetch asks for two parts per ticker, so the allowance is wide. */
  const rl = await checkRateLimit(`capitol-company:${getClientIp(request)}`, {
    limit: 240,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);
  const sp = new URL(request.url).searchParams;
  const ticker = String(sp.get('ticker') || '')
    .trim()
    .toUpperCase();
  if (!TICKER.test(ticker)) return validationResponse('Unknown ticker.');
  const part = sp.get('part') || 'card';
  if (!CACHE[part]) return validationResponse('Unknown part.');
  try {
    const data =
      part === 'prices'
        ? await getCompanyPrices(ticker, RANGES[sp.get('range')] ? sp.get('range') : '1Y')
        : part === 'news'
          ? await getCompanyNews(ticker)
          : await getCompanyCard(ticker);
    return NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': CACHE[part] } });
  } catch (e) {
    console.error('[capitol-hub] company', part, ticker, e?.message || e);
    return NextResponse.json(
      { ok: false, error: 'This company could not be loaded just now.' },
      { status: 503 },
    );
  }
}
