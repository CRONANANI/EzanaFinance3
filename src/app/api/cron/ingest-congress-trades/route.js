import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { refreshCapitolReadModels } from '@/lib/datasets/capitol-hub/read-models';
import { getAdminClient } from '@/lib/supabase';
import { mirrorPhotos, runCongressIngest } from '@/lib/politicians/congress-ingest';
import { readFeeds, readTrades } from '@/lib/politicians/congress-store';
import { SNAPSHOT_ROWS, writeTradesSnapshot } from '@/lib/politicians/trades-snapshot';
import LEGISLATORS from '@/lib/politicians/legislators-current.json';

/**
 * Daily congressional-trades ingest into public.congress_members /
 * public.congress_trades (lib/politicians/congress-ingest.js has the rules).
 * The Politician Tracker reads only those tables; no third party is called at
 * request time.
 *
 * Trade sources and why (parser decision): the repo already parses House
 * Clerk PTR PDFs into public.house_trades (/api/cron/parse-house-ptrs,
 * hourly), so House trades come from the primary source. Senate
 * trades come from public.senate_trades, filled from eFD by the hourly
 * /api/cron/ingest-senate-ptrs. FMP stays as an optional extra behind
 * FMP_CONGRESS_ENABLED (the current key answers 402 for both chambers).
 *
 * After the ingest the newest rows are written to congress_trades_snapshot,
 * the route's fallback.
 *
 * Auth: CRON_SECRET bearer (or ?key=), like the other cron routes.
 *   GET /api/cron/ingest-congress-trades                 members + all trades
 *   GET /api/cron/ingest-congress-trades?chamber=house   one chamber's sources
 *   GET /api/cron/ingest-congress-trades?only=photos     mirror portraits (bounded)
 *   GET /api/cron/ingest-congress-trades?days=4500       backfill (default 400 days)
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if ((request.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  try {
    return new URL(request.url).searchParams.get('key') === secret;
  } catch {
    return false;
  }
}

const fmpEnabled = () =>
  String(process.env.FMP_CONGRESS_ENABLED ?? 'true').toLowerCase() !== 'false';

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const db = getAdminClient();

  try {
    if (searchParams.get('only') === 'photos') {
      const max = Math.min(Math.max(Number(searchParams.get('max')) || 80, 1), 200);
      const photos = await mirrorPhotos({ db, max });
      return NextResponse.json({ ok: true, photos });
    }

    const chamber = ['house', 'senate'].includes(searchParams.get('chamber'))
      ? searchParams.get('chamber')
      : 'all';
    const summary = await runCongressIngest({
      db,
      fallbackLegislators: LEGISLATORS,
      fmpKey: process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '',
      fmpEnabled: fmpEnabled(),
      chamber,
      skipMembers: searchParams.get('members') === '0',
      /* One-off: load every member who has served since 2012 as a former
         member, so trades by people no longer in Congress can match. */
      historical: searchParams.get('historical') === '1',
      /* Backfill: ?days= widens the window the source tables are read over
         (house_trades reaches back to 2015). Upserts are idempotent. */
      windowDays: Math.min(Math.max(Number(searchParams.get('days')) || 400, 30), 4500),
    });

    /* Refresh the route's fallback from what is now in the table. */
    const pages = [];
    for (let p = 0; p * 500 < SNAPSHOT_ROWS; p += 1) {
      const { trades, error } = await readTrades({ page: p, limit: 500 });
      if (error || !trades.length) break;
      pages.push(...trades);
      if (trades.length < 500) break;
    }
    summary.snapshot = pages.length
      ? await writeTradesSnapshot({ trades: pages, feeds: await readFeeds() })
      : false;

    /* The hub's positions, portfolio and heatmap read materialized models
       built from this table; rebuild them, then let the hubs re-read. */
    summary.readModels = await refreshCapitolReadModels();

    // The dimension hubs summarise this table.
    if (summary) revalidateTag('hubs');

    return NextResponse.json({ ok: summary.errors.length === 0, summary });
  } catch (err) {
    console.error('[ingest-congress-trades]', err?.message);
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
