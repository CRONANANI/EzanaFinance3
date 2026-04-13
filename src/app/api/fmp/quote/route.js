import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
// Use v3 instead of stable — v3 supports batching via URL path, stable doesn't
const BASE = 'https://financialmodelingprep.com/api/v3';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const single = (searchParams.get('symbol') || '').toUpperCase().trim();
  const many = (searchParams.get('symbols') || '').toUpperCase().trim();
  const list = many || single;

  if (!list) {
    return NextResponse.json({ error: 'symbol(s) required' }, { status: 400 });
  }
  if (!FMP_KEY) {
    return NextResponse.json({ error: 'FMP_API_KEY not configured' }, { status: 503 });
  }

  try {
    // v3 batch quote: tickers go in the URL path, comma-separated
    // https://financialmodelingprep.com/api/v3/quote/AAPL,NVDA,MSFT?apikey=...
    const url = `${BASE}/quote/${encodeURIComponent(list)}?apikey=${encodeURIComponent(FMP_KEY)}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`FMP quote HTTP ${res.status}`);
    const data = await res.json();
    const quotes = Array.isArray(data) ? data : [data].filter(Boolean);

    // Legacy single-symbol mode — preserve original flat-object response shape
    // so any existing caller using ?symbol=AAPL doesn't break.
    if (single && !many) {
      return NextResponse.json(quotes[0] ?? {});
    }

    // Multi-symbol mode — return both the array and a symbol→price map
    // so the client can O(1) look up prices by ticker.
    const priceMap = {};
    for (const q of quotes) {
      if (q?.symbol && typeof q.price === 'number') {
        priceMap[q.symbol.toUpperCase()] = {
          price: q.price,
          change: q.change ?? 0,
          changesPercentage: q.changesPercentage ?? 0,
        };
      }
    }
    return NextResponse.json({ quotes, priceMap });
  } catch (err) {
    console.error('[fmp/quote]', err.message);
    return NextResponse.json(
      { error: err.message, quotes: [], priceMap: {} },
      { status: 200 }
    );
  }
}
