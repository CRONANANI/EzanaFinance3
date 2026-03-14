import { NextResponse } from 'next/server';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

async function fetchQuote(symbol, apiKey) {
  try {
    const res = await fetch(
      `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.c === 0) return null;
    return {
      symbol,
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      prevClose: data.pc,
    };
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Finnhub API key not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols') || '';
    const symbols = symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);

    if (symbols.length === 0) {
      return NextResponse.json({ error: 'No symbols provided' }, { status: 400 });
    }

    const capped = symbols.slice(0, 50);

    const results = await Promise.all(capped.map((s) => fetchQuote(s, apiKey)));

    const quotes = {};
    results.forEach((r) => {
      if (r) quotes[r.symbol] = r;
    });

    return NextResponse.json({ quotes });
  } catch (error) {
    console.error('Batch quotes error:', error);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}
