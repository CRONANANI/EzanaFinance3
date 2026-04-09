import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const KALSHI_BASE = 'https://trading-api.kalshi.com/trade-api/v2';
const POLYMARKET_GAMMA = 'https://gamma-api.polymarket.com';

async function fetchKalshiMarkets(search, limit = 6) {
  try {
    const params = new URLSearchParams({ limit: String(limit), status: 'open' });
    if (search) params.set('search', search);
    const res = await fetch(`${KALSHI_BASE}/markets?${params}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.markets || []).map((m) => ({
      ticker: m.ticker,
      title: m.title,
      question: m.title,
      yes_bid: m.yes_bid != null ? m.yes_bid / 100 : null,
      probability: m.yes_bid != null ? m.yes_bid / 100 : null,
      volume: m.volume,
      close_time: m.close_time,
    }));
  } catch (err) {
    console.error('[polygon/markets] Kalshi fetch error:', err.message);
    return [];
  }
}

async function fetchPolymarkets(limit = 6) {
  try {
    const res = await fetch(
      `${POLYMARKET_GAMMA}/markets?limit=${limit}&active=true&closed=false&order=volume&ascending=false`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[polygon/markets] Polymarket fetch error:', err.message);
    return [];
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') || 'polymarket';
  const search = searchParams.get('search') || '';
  const limit = parseInt(searchParams.get('limit') || '6', 10);

  try {
    if (source === 'kalshi') {
      const markets = await fetchKalshiMarkets(search, limit);
      return NextResponse.json({ markets, source: 'kalshi' });
    }
    const markets = await fetchPolymarkets(limit);
    return NextResponse.json({ markets, source: 'polymarket' });
  } catch (err) {
    console.error('[polygon/markets]', err.message);
    return NextResponse.json({ markets: [], error: err.message });
  }
}
