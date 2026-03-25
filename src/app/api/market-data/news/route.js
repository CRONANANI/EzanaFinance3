import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';


const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const BASE = 'https://finnhub.io/api/v1';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'general';

    const res = await fetch(`${BASE}/news?category=${category}&token=${FINNHUB_KEY}`, {
      next: { revalidate: 300 },
    });
    const data = await res.json();

    return NextResponse.json({ news: (data || []).slice(0, 50) });
  } catch (error) {
    return NextResponse.json({ error: error.message, news: [] }, { status: 500 });
  }
}
