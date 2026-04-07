import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const BASE    = 'https://financialmodelingprep.com/stable';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || '').toUpperCase().trim();

  if (!symbol) {
    return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  }
  if (!FMP_KEY) {
    return NextResponse.json({ error: 'FMP_API_KEY not configured' }, { status: 503 });
  }

  try {
    const url = `${BASE}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(FMP_KEY)}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`FMP quote HTTP ${res.status}`);
    const data = await res.json();
    // FMP returns array — return first item
    const quote = Array.isArray(data) ? data[0] : data;
    return NextResponse.json(quote ?? {});
  } catch (err) {
    console.error('[fmp/quote]', err.message);
    return NextResponse.json({ error: err.message }, { status: 200 });
  }
}
