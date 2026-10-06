import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getExecCompHistory } from '@/lib/titans/store';

/** GET /api/titans/exec-comp?cik=320193: a company's pay versus performance history. */
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rl = await checkRateLimit(`titans:ec:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);
  const cik = (new URL(request.url).searchParams.get('cik') || '').trim();
  if (!/^\d{1,10}$/.test(cik))
    return NextResponse.json({ ok: false, error: 'Unknown company.' }, { status: 400 });
  try {
    const rows = await getExecCompHistory(cik);
    return NextResponse.json(
      { ok: true, rows },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } },
    );
  } catch (e) {
    console.error('[titans] exec comp:', e?.message || e);
    return NextResponse.json({ ok: false, error: 'Could not load compensation.' }, { status: 500 });
  }
}
