import { NextResponse } from 'next/server';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

export async function GET(request, { params }) {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: 'Finnhub API key not configured' }, { status: 500 });
    }

    const { endpoint } = params;
    const path = Array.isArray(endpoint) ? endpoint.join('/') : endpoint;
    const { searchParams } = new URL(request.url);
    searchParams.set('token', apiKey);

    const url = `${FINNHUB_BASE}/${path}?${searchParams.toString()}`;
    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { message: `Finnhub API error: ${res.status}`, details: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Finnhub proxy error:', error);
    return NextResponse.json(
      { message: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}
