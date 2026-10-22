import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getInvestorDossier } from '@/lib/titans/activist-store';

/**
 * GET /api/titans/activist/investor?cik=: the Investor Dossier, campaigns\n * and mixes for one confirmed investor.
 * Source: SEC EDGAR Schedules 13D and 13G.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE = { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' };

export async function GET(request) {
  const rl = await checkRateLimit(`titans:activist-investor:${getClientIp(request)}`, {
    limit: 120,
  });
  if (!rl.success) return rateLimitResponse(rl);
  const sp = new URL(request.url).searchParams;
  const cik = String(sp.get('cik') || '').replace(/\\D/g, '');
  if (!cik || cik.length > 10) {
    return NextResponse.json({ ok: false, error: 'Unknown investor.' }, { status: 400 });
  }
  try {
    const data = await getInvestorDossier(cik);
    if (!data) return NextResponse.json({ ok: false, error: 'Unknown investor.' }, { status: 404 });
    return NextResponse.json({ ok: true, ...data }, { headers: CACHE });
  } catch (e) {
    console.error('[titans] activist investor:', e?.message || e);
    return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  }
}
