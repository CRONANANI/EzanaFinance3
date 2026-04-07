import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const BASE = 'https://financialmodelingprep.com/stable';

export async function GET(request) {
  if (!FMP_KEY) {
    return NextResponse.json({ error: 'FMP_API_KEY is not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'latest' | 'by-name'
  const name = searchParams.get('name');
  const page = searchParams.get('page') || '0';
  const limit = searchParams.get('limit') || '100';

  try {
    let url;
    if (type === 'by-name' && name) {
      url = `${BASE}/senate-trades-by-name?name=${encodeURIComponent(name)}&apikey=${FMP_KEY}`;
    } else {
      url = `${BASE}/senate-latest?page=${page}&limit=${limit}&apikey=${FMP_KEY}`;
    }

    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`FMP senate error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('FMP senate route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
