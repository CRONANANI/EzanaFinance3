import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { withApiGuard } from '@/lib/api-guard';
import { quiverParams, serveQuiver } from '@/lib/quiver/proxy';

export const dynamic = 'force-dynamic';

const QUIVER_KEY = process.env.QUIVER_API_KEY;
const BASE = 'https://api.quiverquant.com/beta/live/sec13f';

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
    const res = await fetchWithTimeout(
      `${BASE}?${qs.toString()}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${QUIVER_KEY}`,
        },
        next: { revalidate: CACHE_SECONDS },
      },
      10000,
    );

    if (!res.ok) {
      if (res.status === 404) return [];
      console.error(`[quiver/sec13f] page ${page} HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`[quiver/sec13f] page ${page} error:`, err.message);
    return null;
  }
}

/**
 * Sonar 6.4 hardening: signed-in callers only (the only consumer, Inside the Capitol, is a
 * signed-in page, so no user loses access), validated filters, a shared cache, a daily
 * upstream quota per user and an upstream counter (lib/quiver/proxy.js).
 */
async function handler(request, user) {
  if (!QUIVER_KEY) {
    return NextResponse.json({ error: 'QUIVER_API_KEY not configured', data: [] }, { status: 503 });
  }
  const v = quiverParams(new URL(request.url).searchParams, ['ticker', 'owner']);
  if (v.error) return NextResponse.json({ error: `Invalid ${v.error}` }, { status: 400 });
  const filterParams = v.params;

  const out = await serveQuiver({
    route: 'sec13f',
    params: filterParams,
    caller: `u:${user.id}`,
    dailyLimit: 200,
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
          const key = `${r.Name || r.Fund}-${r.Ticker}-${r.Date}-${r.ReportPeriod}`;
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

export const GET = withApiGuard(handler, { requireAuth: true, strict: true });
