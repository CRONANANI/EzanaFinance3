import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { FmpAPI } from '@/lib/services/fmp';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    const q = new URL(request.url).searchParams.get('q') || '';
    if (q.length < 2) return NextResponse.json({ results: [] });
    try {
      const results = await FmpAPI.searchSymbol(q, 10);
      return NextResponse.json({
        results: (results || []).map((r) => ({
          symbol: r.symbol,
          name: r.name || r.companyName,
        })),
      });
    } catch {
      return NextResponse.json({ results: [] });
    }
  },
  { requireAuth: true },
);
