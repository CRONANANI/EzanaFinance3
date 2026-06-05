import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

/* Read at request time, not module load. See stock-candles for the
   full rationale (serverless build-time capture causes stale keys). */
function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

const BASE = 'https://financialmodelingprep.com/stable';

export const GET = withApiGuard(
  async (request) => {
    const FMP_KEY = getFmpKey();
    if (!FMP_KEY) {
      return NextResponse.json([], {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q || q.length < 1) {
      return NextResponse.json([], { status: 200 });
    }

    const key = encodeURIComponent(FMP_KEY);

    try {
      const url = `${BASE}/search?query=${encodeURIComponent(q)}&limit=15&apikey=${key}`;
      const res = await fetch(url, { cache: 'no-store' });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(
          `[fmp/search] FMP ${res.status} for "${q}": key=${FMP_KEY ? FMP_KEY.slice(0, 4) + '***' : 'MISSING'}, body=${body.slice(0, 200)}`,
        );
        return NextResponse.json([], {
          status: 200,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
      }

      const raw = await res.json();
      const results = Array.isArray(raw) ? raw : [];

      const normalized = results
        .map((r) => ({
          symbol: r.symbol || r.ticker || '',
          name: r.name || r.description || r.symbol || '',
          type:
            r.assetType || r.type || (String(r.symbol || '').includes('USD') ? 'Crypto' : 'Stock'),
        }))
        .filter((r) => r.symbol);

      return NextResponse.json(normalized);
    } catch (err) {
      console.error('[fmp/search]', err.message);
      return NextResponse.json([], {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }
  },
  { requireAuth: false },
);
