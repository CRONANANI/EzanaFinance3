import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const BASE = 'https://financialmodelingprep.com/stable';

export async function GET(request) {
  if (!FMP_KEY) {
    return NextResponse.json([], { status: 200 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q || q.length < 1) {
    return NextResponse.json([], { status: 200 });
  }

  const key = encodeURIComponent(FMP_KEY);

  try {
    const url = `${BASE}/search?query=${encodeURIComponent(q)}&limit=15&apikey=${key}`;
    const res = await fetch(url, { next: { revalidate: 300 } });

    if (!res.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const raw = await res.json();
    const results = Array.isArray(raw) ? raw : [];

    const normalized = results
      .map((r) => ({
        symbol: r.symbol || r.ticker || '',
        name: r.name || r.description || r.symbol || '',
        type:
          r.assetType ||
          r.type ||
          (String(r.symbol || '').includes('USD') ? 'Crypto' : 'Stock'),
      }))
      .filter((r) => r.symbol);

    return NextResponse.json(normalized);
  } catch (err) {
    console.error('[fmp/search]', err.message);
    return NextResponse.json([], { status: 200 });
  }
}
