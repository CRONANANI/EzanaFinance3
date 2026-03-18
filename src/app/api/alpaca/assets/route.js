/**
 * GET /api/alpaca/assets — Search tradable stocks/ETFs
 * Query: ?search=AAPL or ?search=apple
 */
import { NextResponse } from 'next/server';
import { alpacaRequest } from '@/lib/alpaca';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    if (!search) {
      return NextResponse.json({ error: 'search param required' }, { status: 400 });
    }

    const assets = await alpacaRequest(`/v1/assets?status=active&asset_class=us_equity`);

    const query = search.toUpperCase();
    const filtered = (Array.isArray(assets) ? assets : [])
      .filter((a) =>
        a.tradable &&
        (a.symbol?.includes(query) || a.name?.toUpperCase().includes(query))
      )
      .slice(0, 20)
      .map((a) => ({
        symbol: a.symbol,
        name: a.name,
        exchange: a.exchange,
        assetClass: a.class,
        tradable: a.tradable,
        fractionable: a.fractionable,
        shortable: a.shortable,
      }));

    return NextResponse.json({ assets: filtered });
  } catch (error) {
    console.error('[Alpaca] Assets search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
