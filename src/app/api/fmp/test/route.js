/**
 * Temporary FMP diagnostic endpoint.
 *
 * Hit `/api/fmp/test` in the browser to find out whether FMP_API_KEY
 * is reaching the serverless runtime at request time, whether FMP
 * accepts it, and which endpoints work on the current plan tier.
 *
 * DELETE THIS FILE once FMP data is confirmed loading. It is intentionally
 * unauthenticated so it can be hit easily from the browser, but it never
 * exposes the full key (only a 6-char prefix + length).
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const key = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';

  if (!key) {
    return NextResponse.json(
      {
        status: 'NO_KEY',
        message: 'Neither FMP_API_KEY nor NEXT_PUBLIC_FMP_API_KEY is set in environment variables',
        env_keys: Object.keys(process.env).filter((k) => k.includes('FMP')),
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      },
    );
  }

  const tests = [
    {
      name: 'quote',
      url: `https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=${encodeURIComponent(key)}`,
    },
    {
      name: 'search',
      url: `https://financialmodelingprep.com/stable/search-symbol?query=AAPL&apikey=${encodeURIComponent(key)}`,
    },
    {
      name: 'historical',
      url: `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=AAPL&from=2026-05-01&to=2026-05-15&apikey=${encodeURIComponent(key)}`,
    },
    {
      name: 'profile',
      url: `https://financialmodelingprep.com/stable/profile?symbol=AAPL&apikey=${encodeURIComponent(key)}`,
    },
  ];

  const results = [];
  for (const test of tests) {
    try {
      const res = await fetch(test.url, { cache: 'no-store' });
      const body = await res.text();
      results.push({
        endpoint: test.name,
        status: res.status,
        ok: res.ok,
        body_preview: body.slice(0, 200),
        content_type: res.headers.get('content-type'),
      });
    } catch (err) {
      results.push({
        endpoint: test.name,
        status: 'FETCH_ERROR',
        error: err.message,
      });
    }
  }

  return NextResponse.json(
    {
      status: 'TESTED',
      key_prefix: key.slice(0, 6) + '***',
      key_length: key.length,
      results,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    },
  );
}
