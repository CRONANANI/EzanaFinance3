/**
 * GET /api/fmp/sector-performance?range=1D|1W|1M|YTD
 *
 * Aggregates FMP sector-performance feeds into a normalized shape used by the
 * Research → Market/Portfolio view's SectorHeatmap card.
 *
 * We prefer the `stable` endpoint first and fall back to the legacy v3
 * endpoint if the account isn't on the latest plan. The API key is
 * server-only; never expose it to the client.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 min — sector totals don't wiggle minute-by-minute

const FMP_KEY = process.env.FMP_API_KEY;
const STABLE = 'https://financialmodelingprep.com/stable';
const V3 = 'https://financialmodelingprep.com/api/v3';

const RANGE_MAP = {
  '1D': 'historical',
  '1W': '1W',
  '1M': '1M',
  YTD: 'YTD',
};

const VALID_RANGES = new Set(Object.keys(RANGE_MAP));

/**
 * Coerce the various shapes FMP uses (varies by endpoint) into a uniform
 * { name, changePct } record. Returns null for entries we can't parse.
 */
function normalizeRow(row) {
  if (!row || typeof row !== 'object') return null;
  const name = row.sector || row.Sector || row.name || null;
  if (!name) return null;

  // FMP returns either a number (e.g. 1.23) or "1.23%" depending on plan/
  // endpoint. Strip any % and parse.
  const rawChange =
    row.changesPercentage ??
    row.changePercentage ??
    row.changePct ??
    row.percent ??
    row.percentChange ??
    row.ytdChangePct ??
    null;

  let changePct = null;
  if (typeof rawChange === 'number') {
    changePct = rawChange;
  } else if (typeof rawChange === 'string') {
    const parsed = Number.parseFloat(rawChange.replace('%', '').trim());
    if (Number.isFinite(parsed)) changePct = parsed;
  }
  if (!Number.isFinite(changePct)) return null;
  return { name, changePct };
}

async function fetchJson(url) {
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`FMP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchSectorPerformance(range) {
  if (!FMP_KEY) {
    throw new Error('FMP_API_KEY is not configured on the server.');
  }

  // 1D is the most commonly supported endpoint; other ranges go through the
  // sector-historical endpoint.
  if (range === '1D') {
    const url = `${STABLE}/sector-performance-snapshot?apikey=${FMP_KEY}`;
    try {
      const data = await fetchJson(url);
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (_) {
      // fall through to v3
    }
    const v3Url = `${V3}/sector-performance?apikey=${FMP_KEY}`;
    return fetchJson(v3Url);
  }

  // Historical ranges: pull from the historical sector endpoint.
  const keyForRange = range === 'YTD' ? 'YTD' : range; // '1W' or '1M'
  const url = `${STABLE}/historical-sector-performance?period=${encodeURIComponent(keyForRange)}&apikey=${FMP_KEY}`;
  try {
    const data = await fetchJson(url);
    if (Array.isArray(data) && data.length > 0) return data;
  } catch (_) {
    // fall through
  }
  // Final fallback: v3 historical endpoint accepts `limit` for daily bars.
  const fallbackUrl = `${V3}/historical-sectors-performance?limit=30&apikey=${FMP_KEY}`;
  return fetchJson(fallbackUrl);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rangeParam = (searchParams.get('range') || '1D').toUpperCase();
    const range = VALID_RANGES.has(rangeParam) ? rangeParam : '1D';

    if (!FMP_KEY) {
      return NextResponse.json(
        {
          sectors: [],
          range,
          error:
            'FMP_API_KEY not configured. Set it in .env.local to enable live sector performance.',
        },
        { status: 503 },
      );
    }

    const raw = await fetchSectorPerformance(range);
    const source = Array.isArray(raw) ? raw : [];
    const normalized = source
      .map(normalizeRow)
      .filter(Boolean)
      // de-dupe by sector name; keep the most recent (first) reading
      .reduce((acc, row) => {
        if (!acc.find((r) => r.name === row.name)) acc.push(row);
        return acc;
      }, []);

    return NextResponse.json({ sectors: normalized, range });
  } catch (err) {
    console.error('[sector-performance] failed:', err);
    return NextResponse.json(
      {
        sectors: [],
        error: 'Failed to fetch sector performance.',
        detail: process.env.NODE_ENV === 'development' ? String(err?.message || err) : undefined,
      },
      { status: 502 },
    );
  }
}
