import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { CITY_NEWS_SOURCES } from '@/config/cityNewsSources';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const cityKey = searchParams.get('city');

    if (!cityKey || !CITY_NEWS_SOURCES[cityKey]) {
      return NextResponse.json({ error: 'Invalid city' }, { status: 400 });
    }

    const cityData = CITY_NEWS_SOURCES[cityKey];

    return NextResponse.json({
      city: cityData.city,
      region: cityData.region,
      sources: cityData.sources,
      articles: [],
    });
  },
  { requireAuth: false },
);
