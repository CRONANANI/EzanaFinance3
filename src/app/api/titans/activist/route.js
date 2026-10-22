import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getActivistFiling } from '@/lib/titans/store';

/**
 * GET /api/titans/activist?accession=0001193125-26-123456
 * One Schedule 13D or 13G filing in full: the investor, every reporting
 * person with type, voting and dispositive power, the 13G filing basis, and
 * the verbatim Item 3 (source of funds) and Item 4 (purpose of transaction)
 * text with its keyword tags. Source: SEC EDGAR Schedules 13D and 13G.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ACC_RE = /^\d{10}-\d{2}-\d{6}$/;

export async function GET(request) {
  const rl = await checkRateLimit(`titans:activist:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const accession = new URL(request.url).searchParams.get('accession') || '';
  if (!ACC_RE.test(accession)) {
    return NextResponse.json({ ok: false, error: 'Unknown filing.' }, { status: 400 });
  }
  try {
    const filing = await getActivistFiling(accession);
    if (!filing) return NextResponse.json({ ok: false, error: 'Unknown filing.' }, { status: 404 });
    return NextResponse.json(
      { ok: true, filing },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } },
    );
  } catch (e) {
    console.error('[titans] activist filing:', e?.message || e);
    return NextResponse.json({ ok: false, error: 'Could not load the filing.' }, { status: 500 });
  }
}
