import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getFundHoldings, getFundTwins } from '@/lib/titans/store';

/**
 * GET /api/titans/fund?cik=0001067983: one 13F filer's latest holdings with
 * the change versus its prior quarter. Source: SEC EDGAR Form 13F-HR.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const rl = await checkRateLimit(`titans:fund:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const cik = new URL(request.url).searchParams.get('cik') || '';
  if (!/^\d{1,10}$/.test(cik)) {
    return NextResponse.json({ ok: false, error: 'Unknown filer.' }, { status: 400 });
  }
  try {
    const withTwins = new URL(request.url).searchParams.get('twins') === '1';
    const fund = await getFundHoldings(cik);
    const twins =
      withTwins && fund?.quarter
        ? await getFundTwins(cik, fund.quarter).catch(() => [])
        : undefined;
    return NextResponse.json(
      { ok: true, fund: fund && twins !== undefined ? { ...fund, twins } : fund },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } },
    );
  } catch (e) {
    console.error('[titans] fund:', e?.message || e);
    return NextResponse.json({ ok: false, error: 'Could not load holdings.' }, { status: 500 });
  }
}
