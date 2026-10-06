import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getFundamentalsHistory } from '@/lib/titans/store';

/** GET /api/titans/fundamentals?ticker=AAPL: annual and quarterly history from SEC XBRL. */
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rl = await checkRateLimit(`titans:fnd:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);
  const ticker = (new URL(request.url).searchParams.get('ticker') || '').trim();
  if (!/^[A-Za-z.\-]{1,10}$/.test(ticker))
    return NextResponse.json({ ok: false, error: 'Unknown ticker.' }, { status: 400 });
  try {
    const history = await getFundamentalsHistory(ticker);
    return NextResponse.json(
      { ok: true, history },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } },
    );
  } catch (e) {
    console.error('[titans] fundamentals:', e?.message || e);
    return NextResponse.json({ ok: false, error: 'Could not load fundamentals.' }, { status: 500 });
  }
}
