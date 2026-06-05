import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/fmp/commodities
 *
 * Returns the latest quote + intraday change for major commodities via FMP batch quote.
 */
const COMMODITIES = [
  { symbol: 'GCUSD', name: 'Gold' },
  { symbol: 'SIUSD', name: 'Silver' },
  { symbol: 'CLUSD', name: 'Crude Oil' },
  { symbol: 'BZUSD', name: 'Brent Crude' },
  { symbol: 'NGUSD', name: 'Nat Gas' },
  { symbol: 'HGUSD', name: 'Copper' },
  { symbol: 'PLUSD', name: 'Platinum' },
  { symbol: 'PAUSD', name: 'Palladium' },
  { symbol: 'ZCUSD', name: 'Corn' },
  { symbol: 'ZSUSD', name: 'Soybeans' },
  { symbol: 'ZWUSD', name: 'Wheat' },
  { symbol: 'KCUSD', name: 'Coffee' },
  { symbol: 'CTUSD', name: 'Cotton' },
];

const FMP_BASE = 'https://financialmodelingprep.com/stable';

export const GET = withApiGuard(
  async (request, user) => {
    const apiKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ quotes: [], error: 'FMP_API_KEY not set' }, { status: 500 });
    }

    try {
      const symbolList = COMMODITIES.map((c) => c.symbol).join(',');
      const res = await fetch(
        `${FMP_BASE}/quote?symbol=${encodeURIComponent(symbolList)}&apikey=${encodeURIComponent(apiKey)}`,
        { next: { revalidate: 60 } },
      );
      if (!res.ok) {
        console.error('[fmp/commodities] FMP returned', res.status);
        return NextResponse.json({ quotes: [], error: `FMP ${res.status}` }, { status: 502 });
      }
      const data = await res.json();
      const raw = Array.isArray(data) ? data : [];

      const nameBySymbol = Object.fromEntries(COMMODITIES.map((c) => [c.symbol, c.name]));
      const quotes = raw
        .filter((q) => q && q.symbol && q.price != null)
        .map((q) => ({
          symbol: q.symbol,
          name: nameBySymbol[q.symbol] || q.name || q.symbol,
          price: Number(q.price) || 0,
          changePercent: Number(q.changesPercentage ?? q.changePercentage ?? q.changePct ?? 0) || 0,
          change: Number(q.change ?? 0) || 0,
        }));

      return NextResponse.json(
        { quotes },
        { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
      );
    } catch (err) {
      console.error('[fmp/commodities]', err);
      return NextResponse.json({ quotes: [], error: String(err?.message || err) }, { status: 502 });
    }
  },
  { requireAuth: false },
);
