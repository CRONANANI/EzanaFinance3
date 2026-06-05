import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAlphaVantageApiKey, fetchAllBulkQuotesAlpha } from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/alpha/bulk-quotes?symbols=AAPL,MSFT
 * Alpha Vantage REALTIME_BULK_QUOTES (up to 100 symbols per upstream request; auto-chunked).
 */
export const GET = withApiGuard(
  async (request) => {
    try {
      if (!getAlphaVantageApiKey()) {
        return NextResponse.json(
          { error: 'ALPHA_VANTAGE_API_KEY not configured' },
          { status: 503 },
        );
      }
      const { searchParams } = new URL(request.url);
      const symbols = (searchParams.get('symbols') || '')
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      if (!symbols.length) {
        return NextResponse.json({ error: 'No symbols provided' }, { status: 400 });
      }
      const quotes = await fetchAllBulkQuotesAlpha(symbols);
      return NextResponse.json(
        { quotes },
        { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
      );
    } catch (e) {
      console.error('[alpha/bulk-quotes]', e);
      return NextResponse.json(
        { error: e.message || 'Failed to fetch bulk quotes' },
        { status: 502 },
      );
    }
  },
  { requireAuth: false },
);
