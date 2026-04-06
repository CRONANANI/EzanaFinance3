import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol     = searchParams.get('symbol');
    const resolution = searchParams.get('resolution') || 'D';
    const from       = searchParams.get('from');
    const to         = searchParams.get('to');

    if (!symbol) {
      return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    }

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      console.error('[stock-candles] FINNHUB_API_KEY is not set');
      return NextResponse.json({ error: 'Finnhub not configured' }, { status: 503 });
    }

    // Default: last 1 year if no from/to provided
    const nowSec  = Math.floor(Date.now() / 1000);
    const fromSec = from  ? parseInt(from, 10)  : nowSec - 365 * 24 * 3600;
    const toSec   = to    ? parseInt(to,   10)  : nowSec;

    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${fromSec}&to=${toSec}&token=${apiKey}`;

    console.log(`[stock-candles] Fetching ${symbol} ${resolution} from ${fromSec} to ${toSec}`);

    const res  = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[stock-candles] Finnhub returned ${res.status}:`, body);
      return NextResponse.json({ error: `Finnhub error ${res.status}`, candles: [] }, { status: 200 });
    }

    const data = await res.json();

    // Handle Finnhub's "no data" status — this is normal for weekends / off-hours
    if (!data || data.s === 'no_data' || !Array.isArray(data.c) || data.c.length === 0) {
      console.log(`[stock-candles] No candle data for ${symbol}`);
      return NextResponse.json({ candles: [], symbol }, { status: 200 });
    }

    const candles = data.c.map((close, i) => ({
      t:     data.t[i],
      date:  new Date(data.t[i] * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      open:  data.o?.[i]  ?? close,
      high:  data.h?.[i]  ?? close,
      low:   data.l?.[i]  ?? close,
      close,
      price: close,
      volume: data.v?.[i] ?? 0,
    }));

    console.log(`[stock-candles] Returning ${candles.length} candles for ${symbol}`);

    return NextResponse.json({ candles, symbol }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });

  } catch (err) {
    console.error('[stock-candles] Unexpected error:', err);
    return NextResponse.json({ error: err.message, candles: [] }, { status: 200 });
  }
}
