import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getActivistFilings } from '@/lib/titans/activist-store';

/**
 * GET /api/titans/activist/filings?w=&form=&tag=&type=&basis=&page=\n * The filings table: window and filters applied, 50 rows per page.
 * Source: SEC EDGAR Schedules 13D and 13G.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE = { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' };

export async function GET(request) {
  const rl = await checkRateLimit(`titans:activist-filings:${getClientIp(request)}`, {
    limit: 120,
  });
  if (!rl.success) return rateLimitResponse(rl);
  const sp = new URL(request.url).searchParams;
  try {
    const data = await getActivistFilings({
      window: ['30d', '90d', '12m', 'all'].includes(sp.get('w')) ? sp.get('w') : 'all',
      form: ['13d', '13g'].includes(sp.get('form')) ? sp.get('form') : null,
      tag: sp.get('tag') || null,
      type: sp.get('type') || null,
      basis: ['b', 'c', 'd'].includes(sp.get('basis')) ? sp.get('basis') : null,
      page: Math.min(Math.max(Number(sp.get('page')) || 1, 1), 40),
    });
    return NextResponse.json({ ok: true, ...data }, { headers: CACHE });
  } catch (e) {
    console.error('[titans] activist filings:', e?.message || e);
    return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  }
}
