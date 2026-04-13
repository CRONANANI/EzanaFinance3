import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const QUIVER_KEY = process.env.QUIVER_API_KEY;
const BASE = 'https://api.quiverquant.com/beta/bulk/congresstrading';

const MAX_PAGES = 10; // safety cap: 10 pages worth of data
const PAGE_SIZE = 500; // Quiver default; explicit for clarity
const CACHE_SECONDS = 300; // 5 minutes

/**
 * Fetch a single page from Quiver's bulk congress trading endpoint.
 * Returns an array (possibly empty) or null on hard failure.
 */
async function fetchPage(page, params) {
  const qs = new URLSearchParams({
    normalized: 'true',
    page: String(page),
    page_size: String(PAGE_SIZE),
    ...params,
  });

  const url = `${BASE}?${qs.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${QUIVER_KEY}`,
      },
      next: { revalidate: CACHE_SECONDS },
    });

    if (!res.ok) {
      // 404 on an empty page is normal at the end of pagination
      if (res.status === 404) return [];
      console.error(`[quiver/congress-trades] page ${page} HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`[quiver/congress-trades] page ${page} fetch failed:`, err.message);
    return null;
  }
}

export async function GET(request) {
  if (!QUIVER_KEY) {
    return NextResponse.json(
      { error: 'QUIVER_API_KEY not configured', trades: [] },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get('ticker') || '').toUpperCase().trim();
  const bioguide = (searchParams.get('bioguide_id') || '').trim();
  const date = (searchParams.get('date') || '').trim();

  const filterParams = {};
  if (ticker) filterParams.ticker = ticker;
  if (bioguide) filterParams.bioguide_id = bioguide;
  if (date) filterParams.date = date;

  const all = [];
  const seen = new Set();

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const rows = await fetchPage(page, filterParams);

    if (rows === null) {
      if (page === 0) {
        return NextResponse.json([], { status: 200 });
      }
      break;
    }

    if (rows.length === 0) break;

    for (const r of rows) {
      const key = `${r.BioGuideID || r.Name}-${r.Ticker}-${r.Traded}-${r.Transaction}-${r.Trade_Size_USD}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(r);
    }

    if (rows.length < PAGE_SIZE) break;
  }

  return NextResponse.json(all);
}
