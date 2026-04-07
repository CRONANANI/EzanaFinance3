import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const BASE = 'https://financialmodelingprep.com/stable';

const TOP_TICKERS = ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'JPM', 'XOM', 'LMT'];

async function fetchHouseByTickers() {
  const results = await Promise.all(
    TOP_TICKERS.map((sym) =>
      fetch(`${BASE}/house-trades?symbol=${encodeURIComponent(sym)}&apikey=${FMP_KEY}`, {
        next: { revalidate: 300 },
      })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
    )
  );
  const flat = results.flat();
  return flat.sort(
    (a, b) =>
      new Date(b.disclosureDate || b.transactionDate || 0) -
      new Date(a.disclosureDate || a.transactionDate || 0)
  );
}

export async function GET(request) {
  if (!FMP_KEY) {
    return NextResponse.json({ error: 'FMP_API_KEY is not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'by-symbol' | 'by-name' | 'latest'
  const name = searchParams.get('name');
  const symbol = searchParams.get('symbol');
  const page = searchParams.get('page') || '0';
  const limit = searchParams.get('limit') || '100';

  try {
    let url;
    if (type === 'by-name' && name) {
      url = `${BASE}/house-trades-by-name?name=${encodeURIComponent(name)}&apikey=${FMP_KEY}`;
    } else if (type === 'by-symbol' && symbol) {
      url = `${BASE}/house-trades?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`;
    } else {
      url = `${BASE}/house-latest?page=${page}&limit=${limit}&apikey=${FMP_KEY}`;
    }

    const res = await fetch(url, { next: { revalidate: 300 } });
    let data;

    if (!res.ok) {
      console.warn(`FMP house-latest HTTP ${res.status}, falling back to multi-ticker house-trades`);
      data = await fetchHouseByTickers();
      return NextResponse.json(data);
    }

    data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      data = await fetchHouseByTickers();
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('FMP house route error:', err);
    try {
      const data = await fetchHouseByTickers();
      return NextResponse.json(data);
    } catch (e2) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
