import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

// Finnhub path segments are simple identifiers (e.g. quote, stock/candle,
// stock/profile2). Restrict to a safe charset so the catch-all route can't be
// abused for path traversal or to rewrite the upstream host.
const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/;

export const GET = withApiGuard(
  async (request, user, context) => {
    try {
      const apiKey = process.env.FINNHUB_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ message: 'Finnhub API key not configured' }, { status: 500 });
      }

      const endpoint = context?.params?.endpoint;
      const segments = Array.isArray(endpoint) ? endpoint : endpoint ? [endpoint] : [];
      if (segments.length === 0 || !segments.every((s) => SAFE_SEGMENT.test(s))) {
        return NextResponse.json({ message: 'Invalid endpoint' }, { status: 400 });
      }
      const path = segments.join('/');

      const { searchParams } = new URL(request.url);
      searchParams.set('token', apiKey);

      const url = `${FINNHUB_BASE}/${path}?${searchParams.toString()}`;
      const res = await fetch(url);

      if (!res.ok) {
        // Don't echo upstream response bodies to the client (info disclosure).
        return NextResponse.json(
          { message: `Finnhub API error: ${res.status}` },
          { status: res.status },
        );
      }

      const data = await res.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Finnhub proxy error:', error);
      return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
