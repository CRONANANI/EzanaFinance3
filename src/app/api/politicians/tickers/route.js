/**
 * GET /api/politicians/tickers?q=<prefix>&days=<7..36500>
 *
 * The Politician Tracker's ticker typeahead: tickers members disclosed
 * trading in the window whose symbol starts with the typed text, exact
 * match first, then by trade count (congress_ticker_search). Symbols only:
 * asset names are never matched as if they were tickers.
 *
 * 503 when the function or the service key is unavailable; the page then
 * hides the suggestions and still accepts a typed symbol.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { daysParam, searchTickers } from '@/lib/politicians/congress-store';

export const revalidate = 900;

export async function GET(request) {
  const rl = await checkRateLimit(`pol:tickers:${getClientIp(request)}`, {
    interval: 60000,
    limit: 120,
  });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const raw = String(searchParams.get('q') || '')
    .trim()
    .toUpperCase();
  /* Same alphabet as tickerParam; an empty prefix lists the most traded. */
  const prefix = /^[A-Z0-9][A-Z0-9./-]{0,11}$/.test(raw) ? raw : null;
  if (raw && !prefix) return NextResponse.json({ ok: true, tickers: [] });

  const { tickers, error } = await searchTickers({
    prefix,
    windowDays: daysParam(searchParams.get('days')),
    limit: 12,
  });
  if (error) {
    console.warn(`[politicians/tickers] ${error}`);
    return NextResponse.json({ ok: false, error: 'Tickers unavailable.' }, { status: 503 });
  }
  return NextResponse.json(
    { ok: true, tickers },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } },
  );
}
