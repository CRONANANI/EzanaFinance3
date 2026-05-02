import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/polymarket/builder-leaderboard?timePeriod=WEEK&limit=25
 *
 * Proxies https://data-api.polymarket.com/v1/builders/leaderboard
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const timePeriod = (searchParams.get('timePeriod') || 'WEEK').toUpperCase();
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 25)));
    const offset = Math.max(0, Number(searchParams.get('offset') || 0));

    const validPeriods = new Set(['DAY', 'WEEK', 'MONTH', 'ALL']);
    if (!validPeriods.has(timePeriod)) {
      return NextResponse.json({ error: 'invalid timePeriod' }, { status: 400 });
    }

    const url = new URL('https://data-api.polymarket.com/v1/builders/leaderboard');
    url.searchParams.set('timePeriod', timePeriod);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    const res = await fetch(url.toString(), {
      next: { revalidate: 120 },
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[builder-leaderboard] upstream', res.status, text.slice(0, 200));
      return NextResponse.json({ error: `upstream ${res.status}`, entries: [] }, { status: res.status });
    }

    const data = await res.json();
    const entries = Array.isArray(data) ? data : [];

    const normalized = entries.map((e, i) => ({
      rank: e.rank ? Number(e.rank) : i + 1,
      builder: e.builder || 'Unknown',
      volume: Number(e.volume) || 0,
      activeUsers: Number(e.activeUsers) || 0,
      verified: Boolean(e.verified),
      builderLogo: e.builderLogo || null,
    }));

    return NextResponse.json({ entries: normalized, timePeriod });
  } catch (e) {
    console.error('[builder-leaderboard]', e);
    return NextResponse.json({ error: e.message, entries: [] }, { status: 500 });
  }
}
