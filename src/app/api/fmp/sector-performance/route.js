/**
 * GET /api/fmp/sector-performance?range=1D|1W|1M|YTD&exchange=NASDAQ
 *
 * Thin wrapper around src/lib/fmp/sector-performance.js. See the library for
 * the full story on why we derive every range — including 1D — from the
 * stable snapshot endpoint (the v3 "live intraday" feed was retired for
 * accounts opened after Aug 31, 2025 and now returns a legacy-endpoint
 * error, which is what was surfacing as "Failed to fetch sector performance").
 *
 * FMP_API_KEY is server-only — never prefix with NEXT_PUBLIC_.
 */
import { NextResponse } from 'next/server';
import { FmpError, getSectorPerformance } from '@/lib/fmp/sector-performance';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

const VALID_RANGES = new Set(['1D', '1W', '1M', 'YTD']);

/** Map a raw error into a user-facing string. Status classification first, then message keywords. */
function classify(err) {
  const msg = err?.message || '';
  if (/FMP_API_KEY/i.test(msg)) {
    return {
      status: 503,
      userMessage: 'Server is missing the FMP_API_KEY environment variable.',
    };
  }
  if (err instanceof FmpError) {
    switch (err.status) {
      case 401:
        return { status: 502, userMessage: 'FMP API key is invalid or expired. Check FMP_API_KEY.' };
      case 402:
        return { status: 502, userMessage: 'This data requires a paid FMP plan.' };
      case 403:
        return { status: 502, userMessage: 'FMP denied access to this data for the current plan.' };
      case 404:
        return { status: 502, userMessage: 'FMP endpoint not found — the URL may have changed upstream.' };
      case 410:
        return {
          status: 502,
          userMessage:
            'FMP retired this endpoint. The server is using the legacy v3 URL and needs an update.',
        };
      case 429:
        return { status: 503, userMessage: 'FMP rate limit hit — please wait a moment and retry.' };
      default:
        return { status: 502, userMessage: `Couldn't reach FMP (HTTP ${err.status}).` };
    }
  }
  return { status: 500, userMessage: "Couldn't load sector performance right now." };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rangeParam = (searchParams.get('range') || '1D').toUpperCase();
  const range = VALID_RANGES.has(rangeParam) ? rangeParam : '1D';
  const exchange = searchParams.get('exchange') || undefined;

  try {
    const { data, asOf, degraded } = await getSectorPerformance(range, exchange);
    return NextResponse.json({
      range,
      asOf,
      sectors: data,
      ...(degraded ? { degraded } : {}),
    });
  } catch (err) {
    // Log the real story server-side. This is where the "Failed to fetch"
    // investigation starts — the client only sees the sanitized userMessage.
    // eslint-disable-next-line no-console
    console.error('[GET /api/fmp/sector-performance] failed:', {
      range,
      exchange,
      name: err?.name,
      status: err instanceof FmpError ? err.status : undefined,
      message: err?.message,
      stack: err?.stack,
    });

    const { status, userMessage } = classify(err);
    const isDev = process.env.NODE_ENV !== 'production';

    return NextResponse.json(
      {
        range,
        sectors: [],
        error: userMessage,
        detail: isDev ? String(err?.message || err) : undefined,
      },
      { status },
    );
  }
}
