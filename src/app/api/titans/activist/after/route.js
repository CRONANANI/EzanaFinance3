import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getEventPricePaths } from '@/lib/titans/activist-store';

/**
 * GET /api/titans/activist/after?w=&form=&tag=: price paths around the\n * event date for recent stakes with a mapped ticker.
 * Source: SEC EDGAR Schedules 13D and 13G.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE = { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' };

export async function GET(request) {
  const rl = await checkRateLimit(`titans:activist-after:${getClientIp(request)}`, { limit: 120 });
  if (!rl.success) return rateLimitResponse(rl);
  const sp = new URL(request.url).searchParams;
  try {
    const data = await getEventPricePaths({
      window: ['30d', '90d', '12m', 'all'].includes(sp.get('w')) ? sp.get('w') : '90d',
      form: ['13d', '13g'].includes(sp.get('form')) ? sp.get('form') : null,
      tag: sp.get('tag') || null,
    });
    return NextResponse.json({ ok: true, ...data }, { headers: CACHE });
  } catch (e) {
    console.error('[titans] activist after:', e?.message || e);
    return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  }
}
