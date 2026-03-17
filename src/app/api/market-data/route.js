import { NextResponse } from 'next/server';
import { fetchMarketData, formatMarketDataForPrompt } from '@/lib/ai/market-data';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
      return NextResponse.json(
        { error: 'ticker query parameter is required' },
        { status: 400 }
      );
    }

    if (!process.env.FMP_API_KEY) {
      return NextResponse.json(
        { error: 'FMP_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const data = await fetchMarketData(ticker);

    if (!data?.quote) {
      return NextResponse.json(
        { error: `No data found for ticker: ${ticker.toUpperCase()}` },
        { status: 404 }
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
      { status: 500 }
    );
  }
}
