import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';


export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    const side = searchParams.get('side') || '';

    if (!user) {
      return NextResponse.json({ error: 'User wallet address is required' }, { status: 400 });
    }

    const params = new URLSearchParams({ user, limit, offset });
    if (side) params.set('side', side);

    const res = await fetch(
      `https://data-api.polymarket.com/activity?${params.toString()}`,
      { next: { revalidate: 30 } }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Polymarket activity error: ${res.status}`, details: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Polymarket activity error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity', details: error?.message },
      { status: 500 }
    );
  }
}
