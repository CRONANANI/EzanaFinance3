import { NextResponse } from 'next/server';
import { fetchMarketData, formatMarketDataForPrompt } from '@/lib/ai/market-data';

export const dynamic = 'force-dynamic';

// Request-time read — module-level captures freeze build-container env
// values, so an FMP key rotation never reaches running lambdas.
function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
      return NextResponse.json({ error: 'ticker query parameter is required' }, { status: 400 });
    }

    if (!getFmpKey()) {
      return NextResponse.json({ error: 'FMP_API_KEY is not configured' }, { status: 500 });
    }

    const data = await fetchMarketData(ticker);

    if (!data?.quote) {
      return NextResponse.json(
        { error: `No data found for ticker: ${ticker.toUpperCase()}` },
        { status: 404 },
      );
    }

    const format = searchParams.get('format');

    if (format === 'prompt') {
      return NextResponse.json({
        ticker: data.ticker,
        prompt: formatMarketDataForPrompt(data),
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Market data error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 },
    );
  }
}
