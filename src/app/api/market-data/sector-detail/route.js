import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getSectorDetail } from '@/lib/research/sector-detail';

/**
 * GET /api/market-data/sector-detail?sector=Utilities&period=1D
 * (`range` is accepted as an alias of `period`.)
 *
 * The Company Research sector modal: top 10 performers in the sector for the
 * period, and the latest sector news. All logic and the Oct 30 root cause
 * live in @/lib/research/sector-detail; provider keys stay server-side.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const sector = (searchParams.get('sector') || '').trim();
    const period = (searchParams.get('period') || searchParams.get('range') || '1D')
      .trim()
      .toUpperCase();
    if (!sector) {
      return NextResponse.json({ error: 'sector param required' }, { status: 400 });
    }

    const trail = [];
    const log = (line) => trail.push(line);
    try {
      const detail = await getSectorDetail(sector, period, { log });
      if (!detail) {
        return NextResponse.json({ error: 'Unknown sector' }, { status: 400 });
      }
      console.log(`[sector-detail] ${detail.canonicalSector} ${detail.period}`, trail.join(' | '));
      const { revalidate, ...body } = detail;
      const empty = !body.topPerformers.length && !body.news.length;
      return NextResponse.json(
        { ...body, range: body.period },
        {
          headers: {
            'Cache-Control':
              empty || body.errors.performers || body.errors.news
                ? 'no-store'
                : `public, s-maxage=${revalidate}, stale-while-revalidate=${revalidate * 2}`,
          },
        },
      );
    } catch (error) {
      console.error('[sector-detail] unexpected error:', error, trail.join(' | '));
      return NextResponse.json(
        {
          error: 'Failed to load sector',
          topPerformers: [],
          news: [],
          errors: { performers: true, news: true },
        },
        { status: 500 },
      );
    }
  },
  { requireAuth: false },
);
