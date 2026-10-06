import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getEtfFund, getEtfHolders, getEtfOverlap } from '@/lib/titans/store';

/**
 * GET /api/titans/etf?series=S000004310            one ETF's latest N-PORT holdings
 * GET /api/titans/etf?holds=AAPL                    tracked ETFs holding a ticker
 * GET /api/titans/etf?a=S000004310&b=S000002277     overlap of two ETFs
 */
export const dynamic = 'force-dynamic';
const SERIES = /^S\d{9}$/;

export async function GET(request) {
  const rl = await checkRateLimit(`titans:etf:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);
  const sp = new URL(request.url).searchParams;
  const headers = { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' };
  try {
    if (sp.get('series')) {
      if (!SERIES.test(sp.get('series')))
        return NextResponse.json({ ok: false, error: 'Unknown fund.' }, { status: 400 });
      return NextResponse.json({ ok: true, fund: await getEtfFund(sp.get('series')) }, { headers });
    }
    if (sp.get('holds')) {
      const t = sp.get('holds').trim();
      if (!/^[A-Za-z.\-]{1,10}$/.test(t))
        return NextResponse.json({ ok: false, error: 'Unknown ticker.' }, { status: 400 });
      return NextResponse.json({ ok: true, holders: await getEtfHolders(t) }, { headers });
    }
    if (sp.get('a') && sp.get('b')) {
      if (!SERIES.test(sp.get('a')) || !SERIES.test(sp.get('b')))
        return NextResponse.json({ ok: false, error: 'Unknown fund.' }, { status: 400 });
      return NextResponse.json(
        { ok: true, overlap: await getEtfOverlap(sp.get('a'), sp.get('b')) },
        { headers },
      );
    }
    return NextResponse.json({ ok: false, error: 'Nothing requested.' }, { status: 400 });
  } catch (e) {
    console.error('[titans] etf:', e?.message || e);
    return NextResponse.json({ ok: false, error: 'Could not load ETF data.' }, { status: 500 });
  }
}
