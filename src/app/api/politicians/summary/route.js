/**
 * GET /api/politicians/summary — the Politician Tracker's aggregate panels,
 * computed in SQL over the full trailing window rather than over the rows a
 * browser happened to load:
 *
 *   rankings  politician_rankings      (table + Top-eight cards)
 *   monthly   congress_monthly_counts  (Trades by month)
 *   tickers   congress_top_tickers     (Most traded tickers)
 *
 * Query: ?chamber=house|senate&party=D|R|I&q=<name or state>&sort=volume|trades|latest.
 * 503 when the RPCs are unavailable (migration not applied, no service key);
 * the page then falls back to computing the panels from its loaded trades.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import {
  chamberParam,
  partyParam,
  queryParam,
  readSummary,
  WINDOW_DAYS,
} from '@/lib/politicians/congress-store';

export const revalidate = 900;

const SORTS = new Set(['volume', 'trades', 'latest']);

export async function GET(request) {
  const rl = await checkRateLimit(`pol:summary:${getClientIp(request)}`, {
    interval: 60000,
    limit: 60,
  });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const sort = SORTS.has(searchParams.get('sort')) ? searchParams.get('sort') : 'volume';
  const summary = await readSummary({
    chamber: chamberParam(searchParams.get('chamber')),
    party: partyParam(searchParams.get('party')),
    q: queryParam(searchParams.get('q')),
    sort,
  });
  if (summary.error) {
    console.warn(`[politicians/summary] ${summary.error}`);
    return NextResponse.json({ ok: false, error: 'Summary unavailable.' }, { status: 503 });
  }
  return NextResponse.json(
    { ok: true, windowDays: WINDOW_DAYS, sort, ...summary, error: undefined },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } },
  );
}
