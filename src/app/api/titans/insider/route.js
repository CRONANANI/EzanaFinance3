import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { searchInsider } from '@/lib/titans/store';

/** GET /api/titans/insider?ticker=AAPL | ?insider=name: Form 4 transactions, last 12 months. */
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rl = await checkRateLimit(`titans:insider:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);
  const sp = new URL(request.url).searchParams;
  const ticker = (sp.get('ticker') || '').trim();
  const insider = (sp.get('insider') || '').trim();
  if (ticker && !/^[A-Za-z.\-]{1,10}$/.test(ticker))
    return NextResponse.json({ ok: false, error: 'Unknown ticker.' }, { status: 400 });
  if (!ticker && insider.length < 3)
    return NextResponse.json({ ok: false, error: 'Type at least three letters.' }, { status: 400 });
  try {
    const rows = await searchInsider({ ticker, insider: insider.slice(0, 60) });
    return NextResponse.json(
      { ok: true, rows },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } },
    );
  } catch (e) {
    console.error('[titans] insider search:', e?.message || e);
    return NextResponse.json({ ok: false, error: 'Could not load transactions.' }, { status: 500 });
  }
}
