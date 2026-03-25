import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';


export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '20';
    const active = searchParams.get('active') || 'true';
    const tag = searchParams.get('tag') || '';

    const params = new URLSearchParams({
      limit,
      active,
      closed: 'false',
      order: 'volume24hr',
      ascending: 'false',
    });

    if (tag) {
      params.set('tag', tag);
    }

    const res = await fetch(
      `https://gamma-api.polymarket.com/markets?${params.toString()}`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Polymarket markets error: ${res.status}`, details: text }, { status: res.status });
    }

    const data = await res.json();
    const markets = (Array.isArray(data) ? data : []).map((m) => ({
      id: m.id,
      question: m.question || m.title || '',
      slug: m.slug || '',
      outcomes: m.outcomes || [],
      outcomePrices: m.outcomePrices || m.outcome_prices || [],
      volume: parseFloat(m.volume) || 0,
      volume24hr: parseFloat(m.volume24hr) || 0,
      liquidity: parseFloat(m.liquidity) || 0,
      endDate: m.endDate || m.end_date_iso || '',
      image: m.image || '',
      icon: m.icon || '',
      category: m.category || '',
      active: m.active,
    }));

    return NextResponse.json(markets);
  } catch (error) {
    console.error('Polymarket markets error:', error);
    return NextResponse.json({ error: 'Failed to fetch markets', details: error?.message }, { status: 500 });
  }
}
