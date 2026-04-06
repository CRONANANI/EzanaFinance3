import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RESOLUTIONS = {
  '1D': '5',
  '1W': '15',
  '1M': 'D',
  '3M': 'D',
  '6M': 'D',
  '1Y': 'W',
};

function fromTimestamp(range) {
  const now = Math.floor(Date.now() / 1000);
  const DAY = 86400;
  switch (range) {
    case '1D':
      return now - DAY;
    case '1W':
      return now - 7 * DAY;
    case '1M':
      return now - 30 * DAY;
    case '3M':
      return now - 90 * DAY;
    case '6M':
      return now - 180 * DAY;
    case '1Y':
      return now - 365 * DAY;
    default:
      return now - 30 * DAY;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = (searchParams.get('symbol') || '').toUpperCase().trim();
    const range = searchParams.get('range') || '1M';

    if (!symbol) {
      return NextResponse.json(
        { error: 'symbol is required', candles: [] },
        { status: 400 }
      );
    }

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      console.error('[stock-candles] FINNHUB_API_KEY not set in environment');
      return NextResponse.json(
        { error: 'API not configured', candles: [] },
        { status: 503 }
      );
    }

    const resolution = RESOLUTIONS[range] ?? 'D';
    const from = fromTimestamp(range);
    const to = Math.floor(Date.now() / 1000);

    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;

    console.log(`[stock-candles] ${symbol} | range=${range} | resolution=${resolution}`);

    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[stock-candles] Finnhub HTTP ${res.status} for ${symbol}:`, body);
      return NextResponse.json(
        { error: `Finnhub ${res.status}`, candles: [] },
        { status: 200 }
      );
    }

    const data = await res.json();

    if (!data || data.s === 'no_data' || !Array.isArray(data.c) || data.c.length === 0) {
      console.warn(`[stock-candles] no_data for ${symbol} | range=${range}`);
      return NextResponse.json({ candles: [], symbol, range }, { status: 200 });
    }

    // Build a label formatter appropriate for the range
    const candles = data.c.map((close, i) => {
      const ts = data.t[i] * 1000;
      const d = new Date(ts);
      let label;
      if (range === '1D') {
        label = d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      } else if (range === '1W') {
        label = d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      } else if (range === '1Y') {
        label = d.toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        });
      } else {
        label = d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }

      return {
        t: data.t[i],
        label,
        open: data.o?.[i] ?? close,
        high: data.h?.[i] ?? close,
        low: data.l?.[i] ?? close,
        close,
        price: close,
        volume: data.v?.[i] ?? 0,
      };
    });

    console.log(`[stock-candles] OK: ${candles.length} candles for ${symbol}`);

    return NextResponse.json({ candles, symbol, range }, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    console.error('[stock-candles] Unexpected error:', err);
    return NextResponse.json(
      { error: err.message, candles: [] },
      { status: 200 }
    );
  }
}
