import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/fmp/crypto
 *
 * Returns the latest quote + change for major cryptocurrencies via FMP batch quote.
 */
const CRYPTOS = [
  { symbol: 'BTCUSD', name: 'Bitcoin' },
  { symbol: 'ETHUSD', name: 'Ethereum' },
  { symbol: 'SOLUSD', name: 'Solana' },
  { symbol: 'XRPUSD', name: 'XRP' },
  { symbol: 'ADAUSD', name: 'Cardano' },
  { symbol: 'AVAXUSD', name: 'Avalanche' },
  { symbol: 'DOTUSD', name: 'Polkadot' },
  { symbol: 'LINKUSD', name: 'Chainlink' },
  { symbol: 'MATICUSD', name: 'Polygon' },
  { symbol: 'ATOMUSD', name: 'Cosmos' },
  { symbol: 'LTCUSD', name: 'Litecoin' },
  { symbol: 'DOGEUSD', name: 'Dogecoin' },
];

const FMP_BASE = 'https://financialmodelingprep.com/stable';

export const GET = withApiGuard(
  async (request, user) => {
    const apiKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ quotes: [], error: 'FMP_API_KEY not set' }, { status: 500 });
    }

    try {
      const symbolList = CRYPTOS.map((c) => c.symbol).join(',');
      const res = await fetch(
        `${FMP_BASE}/quote?symbol=${encodeURIComponent(symbolList)}&apikey=${encodeURIComponent(apiKey)}`,
        { next: { revalidate: 60 } },
      );
      if (!res.ok) {
        console.error('[fmp/crypto] FMP returned', res.status);
        return NextResponse.json({ quotes: [], error: `FMP ${res.status}` }, { status: 502 });
      }
      const data = await res.json();
      const raw = Array.isArray(data) ? data : [];

      const nameBySymbol = Object.fromEntries(CRYPTOS.map((c) => [c.symbol, c.name]));
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
      console.error('[fmp/crypto]', err);
      return NextResponse.json({ quotes: [], error: String(err?.message || err) }, { status: 502 });
    }
  },
  { requireAuth: false },
);
