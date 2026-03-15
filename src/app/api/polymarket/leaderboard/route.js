import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = searchParams.get('window') || '7d';
    const sort = searchParams.get('sort') || 'profit';
    const limit = searchParams.get('limit') || '25';

    const res = await fetch(
      `https://data-api.polymarket.com/leaderboard?window=${encodeURIComponent(window)}&sort=${encodeURIComponent(sort)}&limit=${encodeURIComponent(limit)}`,
      { next: { revalidate: 120 } }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Polymarket leaderboard error: ${res.status}`, details: text }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Polymarket leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard', details: error?.message }, { status: 500 });
  }
}
