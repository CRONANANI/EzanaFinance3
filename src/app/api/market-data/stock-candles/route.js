import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const BASE    = 'https://financialmodelingprep.com/stable';

/** How many calendar days back to fetch per range */
const RANGE_DAYS = {
  '1D':  1,
  '1W':  7,
  '1M':  31,
  '3M':  92,
  '6M':  183,
  '1Y':  365,
};

/** Format a Date → "YYYY-MM-DD" */
function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

/** Build label string for a candle based on the selected range */
function makeLabel(dateStr, range) {
  const d = new Date(dateStr + 'T12:00:00Z');
  if (range === '1D' || range === '1W') {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  if (range === '1Y') {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = (searchParams.get('symbol') || '').toUpperCase().trim();
    const range  = searchParams.get('range') || '1M';

    if (!symbol) {
      return NextResponse.json({ error: 'symbol is required', candles: [] }, { status: 400 });
    }

    if (!FMP_KEY) {
      console.error('[stock-candles] FMP_API_KEY not set');
      return NextResponse.json({ error: 'API not configured', candles: [] }, { status: 503 });
    }

    const days    = RANGE_DAYS[range] ?? 31;
    const toDate  = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const url = `${BASE}/historical-price-eod/full?symbol=${encodeURIComponent(symbol)}&from=${toDateStr(fromDate)}&to=${toDateStr(toDate)}&apikey=${FMP_KEY}`;

    console.log(`[stock-candles] FMP fetch: ${symbol} | range=${range}`);

    const res = await fetch(url, { next: { revalidate: 120 } });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[stock-candles] FMP HTTP ${res.status} for ${symbol}:`, body);
      return NextResponse.json({ error: `FMP ${res.status}`, candles: [] }, { status: 200 });
    }

    const raw = await res.json();

    // FMP returns an array of daily bars, newest first — reverse so chart goes left→right
    if (!Array.isArray(raw) || raw.length === 0) {
      console.warn(`[stock-candles] no data for ${symbol} | range=${range}`);
      return NextResponse.json({ candles: [], symbol, range }, { status: 200 });
    }

    // For 1D range, FMP EOD only has yesterday's bar — still show it as single point
    const sorted = [...raw].reverse(); // oldest first

    const candles = sorted.map((bar) => ({
      t:      new Date(bar.date).getTime() / 1000,
      label:  makeLabel(bar.date, range),
      open:   bar.open   ?? bar.close,
      high:   bar.high   ?? bar.close,
      low:    bar.low    ?? bar.close,
      close:  bar.close,
      price:  bar.close,          // StockPriceChart uses `price` as the chart dataKey
      volume: bar.volume ?? 0,
      change: bar.change ?? 0,
      changePercent: bar.changePercent ?? 0,
    }));

    console.log(`[stock-candles] OK: ${candles.length} candles for ${symbol}`);

    return NextResponse.json({ candles, symbol, range }, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' },
    });

  } catch (err) {
    console.error('[stock-candles] Unexpected error:', err);
    return NextResponse.json({ error: err.message, candles: [] }, { status: 200 });
  }
}
