/**
 * GET /api/politicians/trades — the canonical, enriched STOCK Act firehose.
 *
 * Fans out to FMP senate-latest + house-latest (the no-symbol "latest
 * disclosures" firehose), normalizes every row via normalizeFmpTrade +
 * enrichTrade, merges both chambers, sorts by filedAt desc. The page binds ONLY
 * these canonical fields — no raw-FMP parsing in components. Query:
 * ?page=0&limit=200.
 *
 * NOTE: FMP's `senate-trades`/`house-trades` REQUIRE a `symbol` param — calling
 * them without one returns an error, which is why the old firehose came back
 * empty (502) while the by-symbol ticker search worked. The firehose lives at
 * `senate-latest`/`house-latest`.
 *
 * Upstream failure never blanks the page: a successful page 0 is saved to
 * public.congress_trades_snapshot, and when FMP fails (e.g. HTTP 402, the
 * endpoints not on the current plan) the last snapshot is served with status
 * 200 and `X-Data-Stale: true`. 502 only when no fetch has ever succeeded.
 * FMP_CONGRESS_ENABLED=false skips FMP entirely and serves the snapshot.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { normalizeFmpTrade } from '@/lib/politicians/normalize-trade';
import { enrichTrade } from '@/lib/politicians/member-directory';
import {
  pageSnapshot,
  readTradesSnapshot,
  writeTradesSnapshot,
} from '@/lib/politicians/trades-snapshot';

export const dynamic = 'force-dynamic';

const BASE = 'https://financialmodelingprep.com/stable';
const getFmpKey = () => process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
/* Default on; only the literal 'false' turns FMP off. */
const fmpEnabled = () =>
  String(process.env.FMP_CONGRESS_ENABLED ?? 'true').toLowerCase() !== 'false';

// FMP caps the latest endpoints at 100 rows/page.
const FMP_PAGE_LIMIT = 100;

async function fetchChamber(chamber, key, page) {
  const endpoint = chamber === 'Senate' ? 'senate-latest' : 'house-latest';
  try {
    const url = `${BASE}/${endpoint}?page=${page}&limit=${FMP_PAGE_LIMIT}&apikey=${encodeURIComponent(key)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { rows: [], status: res.status };
    const data = await res.json();
    const rows = Array.isArray(data)
      ? data.map((r) => enrichTrade(normalizeFmpTrade(r, chamber)))
      : [];
    return { rows, status: 200 };
  } catch (err) {
    return { rows: [], status: 0, error: err?.message };
  }
}

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
  const page = Math.max(0, Number(searchParams.get('page')) || 0);
  const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit')) || 200));

  if (!fmpEnabled()) {
    const stale = await staleResponse(page, limit, 'live source disabled');
    if (stale) return stale;
    return NextResponse.json(
      { ok: false, error: 'Congressional disclosures are temporarily unavailable.' },
      { status: 502 },
    );
  }

  const key = getFmpKey();
  if (!key) {
    /* 503 is the page's "no source configured" signal (sample fixture), so
       a snapshot still wins when one exists. */
    const stale = await staleResponse(page, limit, 'live source not configured');
    if (stale) return stale;
    return NextResponse.json(
      { ok: false, error: 'Live congressional data source is not configured.' },
      { status: 503 },
    );
  }

  const [senate, house] = await Promise.all([
    fetchChamber('Senate', key, page),
    fetchChamber('House', key, page),
  ]);
  if (senate.status !== 200 || house.status !== 200) {
    console.warn(
      `[politicians/trades] upstream senate HTTP ${senate.status}, house HTTP ${house.status}` +
        (senate.error || house.error ? ` (${senate.error || house.error})` : ''),
    );
  }

  // Return whatever is real: a transient single-chamber failure must NOT blank
  // the whole table.
  const merged = [...senate.rows, ...house.rows]
    .filter((t) => t.name && t.name !== 'Unknown')
    .sort((a, b) => String(b.filedAt || '').localeCompare(String(a.filedAt || '')))
    .slice(0, limit);

  if (merged.length === 0) {
    const stale = await staleResponse(page, limit, 'upstream unavailable');
    if (stale) return stale;
    return NextResponse.json(
      {
        ok: false,
        error: 'Live congressional data is temporarily unavailable. Try again shortly.',
      },
      { status: 502 },
    );
  }
  /* Per-feed status so the page can say which chamber is missing rather
     than silently showing half of Congress. */
  const feeds = {
    house: house.rows.length ? 'ok' : 'down',
    senate: senate.rows.length ? 'ok' : 'down',
  };
  if (page === 0) await writeTradesSnapshot({ trades: merged, feeds });
  return NextResponse.json({ ok: true, feeds, trades: merged });
}
