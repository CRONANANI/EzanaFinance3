/**
 * GET /api/datasets/capitol/portfolio?party=D|R&chamber=house|senate
 * Congress's portfolio: the 16 stocks the most members hold (inferred open
 * positions), with the estimated value range across them. Public; rate-limited.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getPortfolio } from '@/lib/datasets/capitol-hub/data';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rl = await checkRateLimit(`capitol-portfolio:${getClientIp(request)}`, {
    limit: 60,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);
  const sp = new URL(request.url).searchParams;
  const out = await getPortfolio(sp.get('party'), sp.get('chamber'));
  if (out?.error) {
    return NextResponse.json(
      { ok: false, error: 'This signal could not be loaded just now.' },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { ok: true, ...out },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300' } },
  );
}
