import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getSecurityHolders } from '@/lib/titans/store';

/**
 * GET /api/titans/security?key=<ticker or 9-char CUSIP>&page=1
 * The Security X-ray: one security across the latest complete quarter and
 * its prior (holders, breadth, the paged holder ladder, who joined and who
 * left, cross-signals by ticker). Source: SEC EDGAR Form 13F-HR.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE = { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' };

export async function GET(request) {
  const rl = await checkRateLimit(`titans:security:${getClientIp(request)}`, { limit: 120 });
  if (!rl.success) return rateLimitResponse(rl);

  const sp = new URL(request.url).searchParams;
  const key = String(sp.get('key') || '').trim();
  if (!key || key.length > 12) {
    return NextResponse.json({ ok: false, error: 'Unknown security.' }, { status: 400 });
  }
  try {
    const data = await getSecurityHolders(key, { page: Number(sp.get('page')) || 1 });
    if (!data) {
      return NextResponse.json({ ok: false, error: 'Unknown security.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...data }, { headers: CACHE });
  } catch (e) {
    console.error('[titans] security:', e?.message || e);
    return NextResponse.json(
      { ok: false, error: 'Could not load this security.' },
      { status: 503 },
    );
  }
}
