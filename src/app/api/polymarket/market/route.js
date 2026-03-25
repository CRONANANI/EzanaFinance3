import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';


export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');
    const tokenId = searchParams.get('token_id');

    if (!slug && !id) {
      return NextResponse.json({ error: 'Market slug or id is required' }, { status: 400 });
    }

    const params = new URLSearchParams();
    if (slug) params.set('slug', slug);
    if (id) params.set('id', id);

    const marketRes = await fetch(
      `https://gamma-api.polymarket.com/markets?${params.toString()}`,
      { next: { revalidate: 60 } }
    );

    if (!marketRes.ok) {
      return NextResponse.json(
        { error: `Polymarket market error: ${marketRes.status}` },
        { status: marketRes.status }
      );
    }

    const marketData = await marketRes.json();
    const market = Array.isArray(marketData) ? marketData[0] : marketData;

    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    let price = null;
    if (tokenId) {
      try {
        const priceRes = await fetch(
          `https://clob.polymarket.com/price?token_id=${encodeURIComponent(tokenId)}`,
          { next: { revalidate: 15 } }
        );
        if (priceRes.ok) {
          price = await priceRes.json();
        }
      } catch {
        // CLOB price is optional enrichment
      }
    }

    return NextResponse.json({
      id: market.id,
      question: market.question || market.title || '',
      slug: market.slug || '',
      description: market.description || '',
      outcomes: market.outcomes || [],
      outcomePrices: market.outcomePrices || [],
      volume: parseFloat(market.volume) || 0,
      volume24hr: parseFloat(market.volume24hr) || 0,
      liquidity: parseFloat(market.liquidity) || 0,
      startDate: market.startDate || '',
      endDate: market.endDate || market.end_date_iso || '',
      image: market.image || '',
      icon: market.icon || '',
      category: market.category || '',
      active: market.active,
      closed: market.closed,
      resolvedBy: market.resolvedBy || '',
      ...(price && { clobPrice: price }),
    });
  } catch (error) {
    console.error('Polymarket market error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market', details: error?.message },
      { status: 500 }
    );
  }
}
