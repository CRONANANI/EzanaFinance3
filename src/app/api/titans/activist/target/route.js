import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getTargetFile } from '@/lib/titans/activist-store';

/**
 * GET /api/titans/activist/target?key=<ticker or CUSIP>: the Target File,\n * current 5% holders, the filing timeline and the market response.
 * Source: SEC EDGAR Schedules 13D and 13G.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE = { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' };

export async function GET(request) {
  const rl = await checkRateLimit(`titans:activist-target:${getClientIp(request)}`, { limit: 120 });
  if (!rl.success) return rateLimitResponse(rl);
  const sp = new URL(request.url).searchParams;
  const key = String(sp.get('key') || '').trim();
  if (!key || key.length > 12) {
    return NextResponse.json({ ok: false, error: 'Unknown target.' }, { status: 400 });
  }
  try {
    const data = await getTargetFile(key);
    if (!data) return NextResponse.json({ ok: false, error: 'Unknown target.' }, { status: 404 });
    return NextResponse.json({ ok: true, ...data }, { headers: CACHE });
  } catch (e) {
    console.error('[titans] activist target:', e?.message || e);
    return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  }
}
