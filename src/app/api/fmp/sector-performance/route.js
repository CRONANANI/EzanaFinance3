/**
 * GET /api/fmp/sector-performance?range=1D|1W|1M|YTD&exchange=NASDAQ
 *
 * Thin wrapper around src/lib/fmp/sector-performance.js. Pulls live intraday
 * performance for 1D and compounds historical daily snapshots for 1W / 1M /
 * YTD. See the library file for the why on compounding vs summing.
 *
 * FMP_API_KEY is server-only — never prefix with NEXT_PUBLIC_.
 */
import { NextResponse } from 'next/server';
import { getSectorPerformance } from '@/lib/fmp/sector-performance';

export const dynamic = 'force-dynamic';
// 60s ISR: matches the live endpoint's 1-minute refresh. Longer ranges
// naturally cache harder because their upstream snapshot URLs don't change
// hour-to-hour once the market closes.
export const revalidate = 60;

const VALID_RANGES = new Set(['1D', '1W', '1M', 'YTD']);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rangeParam = (searchParams.get('range') || '1D').toUpperCase();
  const range = VALID_RANGES.has(rangeParam) ? rangeParam : '1D';
  const exchange = searchParams.get('exchange') || undefined;

  if (!process.env.FMP_API_KEY) {
    return NextResponse.json(
      {
        range,
        sectors: [],
        error:
          'FMP_API_KEY not configured. Set it in .env.local to enable live sector performance.',
      },
      { status: 503 },
    );
  }

  try {
    const sectors = await getSectorPerformance(range, exchange);
    return NextResponse.json({ range, sectors });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[sector-performance]', err);
    return NextResponse.json(
      {
        range,
        sectors: [],
        error: 'Failed to fetch sector performance.',
        detail: process.env.NODE_ENV === 'development' ? String(err?.message || err) : undefined,
      },
      { status: 502 },
    );
  }
}
