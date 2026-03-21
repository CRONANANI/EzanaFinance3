import { NextResponse } from 'next/server';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const BASE = 'https://finnhub.io/api/v1';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const [econRes, newsRes] = await Promise.all([
      fetch(`${BASE}/calendar/economic?from=${weekAgo}&to=${today}&token=${FINNHUB_KEY}`),
      fetch(`${BASE}/news?category=general&token=${FINNHUB_KEY}`),
    ]);

    const econData = await econRes.json();
    const newsData = await newsRes.json();

    const econEvents = (econData?.economicCalendar || []).slice(0, 20).map((e, i) => ({
      id: `econ-${i}`,
      type: 'economic',
      title: e.event || 'Economic Event',
      country: e.country || 'Global',
      time: e.time || today,
      impact: e.impact === 3 ? 'CRITICAL' : e.impact === 2 ? 'ELEVATED' : 'MODERATE',
      actual: e.actual,
      estimate: e.estimate,
      previous: e.prev,
      body: [
        e.event,
        e.actual != null ? `Actual: ${e.actual}` : null,
        e.estimate != null ? `Estimate: ${e.estimate}` : null,
        e.prev != null ? `Previous: ${e.prev}` : null,
      ]
        .filter(Boolean)
        .join('. '),
    }));

    const newsEvents = (Array.isArray(newsData) ? newsData : []).slice(0, 30).map((n) => ({
      id: `news-${n.id || n.headline?.slice(0, 10)}`,
      type: 'news',
      title: n.headline,
      country: 'Global',
      time: n.datetime ? new Date(n.datetime * 1000).toISOString() : new Date().toISOString(),
      impact: 'MODERATE',
      body: n.summary || n.headline,
      source: n.source,
      url: n.url,
    }));

    const combined = [...econEvents, ...newsEvents].sort((a, b) => {
      const tA = new Date(a.time).getTime() || 0;
      const tB = new Date(b.time).getTime() || 0;
      return tB - tA;
    });

    return NextResponse.json(
      { events: combined.slice(0, 40) },
      {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message, events: [] }, { status: 500 });
  }
}
