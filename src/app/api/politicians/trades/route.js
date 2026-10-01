/**
 * GET /api/politicians/trades — the canonical, enriched STOCK Act feed.
 *
 * Reads public.congress_trades (joined to public.congress_members), which the
 * daily cron /api/cron/ingest-congress-trades fills from the House Clerk PTR
 * parser, the Senate table and, behind FMP_CONGRESS_ENABLED, FMP. No third
 * party is called at request time.
 *
 * Query: ?page=0&limit=200, and SQL-side filters ?chamber=house|senate,
 * ?party=D|R|I, ?q=<name>, ?bioguide=<id>, ?ticker=<symbol>, and the period
 * ?days=<7..36500> (365 when absent). Newest disclosures first.
 *
 * Upstream failure never blanks the page: when the read fails, or the table
 * is empty, the last good payload in public.congress_trades_snapshot (written
 * by the cron) is served with status 200 and `X-Data-Stale: true`. 502 only
 * when there has never been a successful ingest.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import {
  chamberParam,
  daysParam,
  partyParam,
  queryParam,
  readFeeds,
  readTrades,
  WINDOW_DAYS,
} from '@/lib/politicians/congress-store';
import { pageSnapshot, readTradesSnapshot } from '@/lib/politicians/trades-snapshot';

export const revalidate = 900;

const CACHE = { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' };

/** Serve the last good payload, or null when there has never been one. */
async function staleResponse(page, limit, reason) {
  const snap = await readTradesSnapshot();
  if (!snap) return null;
  return NextResponse.json(
    {
      ok: true,
      stale: true,
      reason,
      fetchedAt: snap.fetchedAt,
      feeds: snap.payload.feeds || null,
      trades: pageSnapshot(snap.payload, page, limit),
    },
    { status: 200, headers: { 'X-Data-Stale': 'true', 'Cache-Control': 'no-store' } },
  );
}

export async function GET(request) {
  const rl = await checkRateLimit(`pol:trades:${getClientIp(request)}`, {
    interval: 60000,
    limit: 60,
  });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const page = Math.max(0, Math.min(50, Number(searchParams.get('page')) || 0));
  const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit')) || 200));
  const filters = {
    chamber: chamberParam(searchParams.get('chamber')),
    party: partyParam(searchParams.get('party')),
    q: queryParam(searchParams.get('q')),
    bioguide: /^[A-Z]\d{6}$/.test(searchParams.get('bioguide') || '')
      ? searchParams.get('bioguide')
      : null,
    ticker: /^[A-Za-z.]{1,8}$/.test(searchParams.get('ticker') || '')
      ? searchParams.get('ticker').toUpperCase()
      : null,
  };
  const filtered = Object.values(filters).some(Boolean);
  const windowDays = daysParam(searchParams.get('days'));

  const { trades, error } = await readTrades({ ...filters, page, limit, windowDays });
  if (error) console.warn(`[politicians/trades] read failed: ${error}`);

  /* An unfiltered first page with no rows means nothing has been ingested
     yet; a filtered or later page, or a short period, may legitimately be
     empty (the snapshot is the default year, so it must not stand in for a
     30-day view). */
  const defaultView = !filtered && windowDays === WINDOW_DAYS;
  if (error || (defaultView && page === 0 && trades.length === 0)) {
    const stale = await staleResponse(page, limit, error ? 'read failed' : 'not yet ingested');
    if (stale) return stale;
    /* 503 is the page's "no source configured" signal (sample fixture). */
    if (error === 'not configured') {
      return NextResponse.json(
        { ok: false, error: 'Congressional data source is not configured.' },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Congressional disclosures are temporarily unavailable.' },
      { status: 502 },
    );
  }

  const feeds = page === 0 && !filtered ? await readFeeds(windowDays) : null;
  return NextResponse.json({ ok: true, feeds, trades }, { headers: CACHE });
}
