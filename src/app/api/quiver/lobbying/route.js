import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const QUIVER_KEY = process.env.QUIVER_API_KEY;
const BASE = 'https://api.quiverquant.com/beta/live/lobbying';

const MAX_PAGES = 5;
const PAGE_SIZE = 500;
const CACHE_SECONDS = 300;

async function fetchPage(page, params) {
  const qs = new URLSearchParams({
    page: String(page),
    page_size: String(PAGE_SIZE),
    ...params,
  });

  try {
    const res = await fetch(`${BASE}?${qs.toString()}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${QUIVER_KEY}`,
      },
      next: { revalidate: CACHE_SECONDS },
    });

    if (!res.ok) {
      if (res.status === 404) return [];
      console.error(`[quiver/lobbying] page ${page} HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`[quiver/lobbying] page ${page} error:`, err.message);
    return null;
  }
}

export async function GET(request) {
  if (!QUIVER_KEY) {
    return NextResponse.json(
      { error: 'QUIVER_API_KEY not configured', data: [] },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const filterParams = {};

  const ticker = (searchParams.get('ticker') || '').toUpperCase().trim();
  if (ticker) filterParams.ticker = ticker;

  const client = (searchParams.get('client') || '').trim();
  if (client) filterParams.client = client;

  const dateFrom = (searchParams.get('date_from') || '').trim();
  if (dateFrom) filterParams.date_from = dateFrom;

  const dateTo = (searchParams.get('date_to') || '').trim();
  if (dateTo) filterParams.date_to = dateTo;

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
      const key = `${r.Client}-${r.Registrant}-${r.Date}-${r.Amount}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(r);
    }

    if (rows.length < PAGE_SIZE) break;
  }

  return NextResponse.json(all);
}
