/**
 * /api/echo/hub — public Echo hub payload (cards + featured + the Chart of the
 * Week), served from the database.
 */
import { NextResponse } from 'next/server';
import { getHubData, getChartOfTheWeek } from '@/lib/echo-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const [{ articles, featured }, chart] = await Promise.all([
      getHubData(),
      // The chart is optional: a failure here never costs the reader the feed.
      getChartOfTheWeek().catch((e) => {
        console.error('[echo] chart of the week:', e?.message || e);
        return null;
      }),
    ]);
    return NextResponse.json({ articles, featured, chart });
  } catch (e) {
    console.error('[echo] hub route:', e?.message || e);
    return NextResponse.json({ articles: [], featured: null, chart: null }, { status: 500 });
  }
}
