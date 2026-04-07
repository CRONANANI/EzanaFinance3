import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const BASE    = 'https://financialmodelingprep.com/stable';

const RANGE_DAYS = {
  '1D':   2,
  '1W':   10,
  '1M':   35,
  '3M':   95,
  '6M':   186,
  '1Y':   370,
  '3Y':   1100,
  '5Y':   1830,
  'ALL':  7300,  // ~20 years — FMP returns what it has
};

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function makeLabel(dateStr, range) {
  const d = new Date(dateStr + 'T12:00:00Z');
  if (range === '1D' || range === '1W') {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  if (range === '3Y' || range === '5Y' || range === 'ALL') {
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  if (range === '1Y') {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Retry once on 429 with a short delay
async function fetchWithRetry(url, cacheSeconds = 300) {
  const opts = { next: { revalidate: cacheSeconds } };
  let res = await fetch(url, opts);

  if (res.status === 429) {
    // Wait 1.5s then try once more
    await new Promise((r) => setTimeout(r, 1500));
    res = await fetch(url, { cache: 'no-store' });
  }

  return res;
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
      return NextResponse.json({ error: 'API not configured', candles: [] }, { status: 503 });
    }

    const days     = RANGE_DAYS[range] ?? 35;
    const toDate   = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const url = `${BASE}/historical-price-eod/full?symbol=${encodeURIComponent(symbol)}&from=${toDateStr(fromDate)}&to=${toDateStr(toDate)}&apikey=${FMP_KEY}`;

    // Long historical ranges: cache for 24hrs (data doesn't change)
    const cacheSeconds = range === '1D' ? 900 : (['3Y', '5Y', 'ALL'].includes(range) ? 86400 : 3600);
    const res = await fetchWithRetry(url, cacheSeconds);

    if (!res.ok) {
      if (res.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit reached. Please wait a moment and try again.', candles: [], rateLimited: true },
          {
            status: 200,
            headers: { 'Retry-After': '10' },
          }
        );
      }
      const body = await res.text();
      console.error(`[stock-candles] FMP HTTP ${res.status}:`, body);
      return NextResponse.json({ error: `FMP ${res.status}`, candles: [] }, { status: 200 });
    }

    const raw = await res.json();

    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json({ candles: [], symbol, range }, { status: 200 });
    }

    const sorted = [...raw].reverse(); // oldest first

    const candles = sorted.map((bar) => ({
      t:             new Date(bar.date).getTime() / 1000,
      label:         makeLabel(bar.date, range),
      open:          bar.open   ?? bar.close,
      high:          bar.high   ?? bar.close,
      low:           bar.low    ?? bar.close,
      close:         bar.close,
      price:         bar.close,
      volume:        bar.volume ?? 0,
      change:        bar.change ?? 0,
      changePercent: bar.changePercent ?? 0,
    }));

    return NextResponse.json({ candles, symbol, range }, {
      headers: {
        'Cache-Control': `public, s-maxage=${cacheSeconds}, stale-while-revalidate=120`,
      },
    });

  } catch (err) {
    console.error('[stock-candles] error:', err);
    return NextResponse.json({ error: err.message, candles: [] }, { status: 200 });
  }
}
