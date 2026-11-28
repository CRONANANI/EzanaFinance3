import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { withApiGuard } from '@/lib/api-guard';
import { getClientIp } from '@/lib/client-ip';
import { quiverParams, serveQuiver } from '@/lib/quiver/proxy';

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
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${QUIVER_KEY}`,
        },
        next: { revalidate: CACHE_SECONDS },
      },
      15000,
    );

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

/**
 * Sonar 6.4 hardening: guests keep access (Sonar's guest dossier reads this route; changing
 * that is an access-policy decision), with validated filters, a shared cache, a strict
 * per-minute limit, a daily upstream quota per user or IP and an upstream counter.
 */
async function handler(request) {
  if (!QUIVER_KEY) {
    return NextResponse.json(
      { error: 'QUIVER_API_KEY not configured', trades: [] },
      { status: 503 },
    );
  }
  const v = quiverParams(new URL(request.url).searchParams, ['ticker', 'bioguide_id', 'date']);
  if (v.error) return NextResponse.json({ error: `Invalid ${v.error}` }, { status: 400 });
  const filterParams = v.params;
  const uid = request.headers.get('x-ezana-uid') || '';
  const caller = uid ? `u:${uid}` : `ip:${getClientIp(request) || 'unknown'}`;

  const out = await serveQuiver({
    route: 'congress-trades',
    params: filterParams,
    caller,
    dailyLimit: uid ? 300 : 60,
    fetchAll: async () => {
      const all = [];
      const seen = new Set();
      let pages = 0;
      for (let page = 0; page < MAX_PAGES; page += 1) {
        // eslint-disable-next-line no-await-in-loop
        const rows = await fetchPage(page, filterParams);
        pages += 1;
        if (rows === null) return { rows: all, pages, failed: page === 0 };
        if (rows.length === 0) break;
        for (const r of rows) {
          const key = `${r.BioGuideID || r.Name}-${r.Ticker}-${r.Traded}-${r.Transaction}-${r.Trade_Size_USD}`;
          if (seen.has(key)) continue;
          seen.add(key);
          all.push(r);
        }
        if (rows.length < PAGE_SIZE) break;
      }
      return { rows: all, pages };
    },
  });
  if (out.quotaExceeded) {
    return NextResponse.json(
      { error: 'Daily limit for this data reached. Please try again later.' },
      { status: 429 },
    );
  }
  return NextResponse.json(out.rows);
}

export const GET = withApiGuard(handler, { requireAuth: false, strict: true });
