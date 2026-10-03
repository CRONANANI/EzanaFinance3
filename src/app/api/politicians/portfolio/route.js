/**
 * GET /api/politicians/portfolio?bioguide=<id> — one member's estimated open
 * portfolio for the Politician Tracker panel: top holdings by estimated size
 * and the sector breakdown, over every disclosure on file
 * (politician_portfolio RPC, 20261003120000).
 *
 * Estimates from STOCK Act ranges, never holdings. 503 while the RPC is
 * unavailable (migration not applied); the panel then says so instead of
 * drawing anything.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { readPortfolio } from '@/lib/politicians/congress-store';

export const revalidate = 900;

export async function GET(request) {
  const rl = await checkRateLimit(`pol:portfolio:${getClientIp(request)}`, {
    interval: 60000,
    limit: 60,
  });
  if (!rl.success) return rateLimitResponse(rl);

  const bioguide = new URL(request.url).searchParams.get('bioguide') || '';
  if (!/^[A-Z]\d{6}$/.test(bioguide)) {
    return NextResponse.json({ ok: false, error: 'bioguide required' }, { status: 400 });
  }
  const { portfolio, error } = await readPortfolio(bioguide, 10);
  if (error) {
    console.warn(`[politicians/portfolio] ${error}`);
    return NextResponse.json({ ok: false, error: 'Portfolio unavailable.' }, { status: 503 });
  }
  return NextResponse.json(
    { ok: true, bioguide, ...portfolio },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } },
  );
}
