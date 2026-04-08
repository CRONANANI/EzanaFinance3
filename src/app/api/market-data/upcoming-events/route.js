import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY;
const FMP_STABLE = 'https://financialmodelingprep.com/stable';

function impactLevel(impact) {
  const s = String(impact ?? '').toLowerCase();
  if (s === 'high') return 'high';
  if (s === 'medium') return 'medium';
  return s;
}

export async function GET() {
  try {
    if (!FMP_KEY) {
      return NextResponse.json(
        { events: [] },
        { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } }
      );
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const firstDay = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0];
    const key = encodeURIComponent(FMP_KEY);

    const [econRes, earningsRes] = await Promise.all([
      fetch(`${FMP_STABLE}/economic-calendar?from=${firstDay}&to=${lastDay}&apikey=${key}`),
      fetch(`${FMP_STABLE}/earnings-calendar?from=${firstDay}&to=${lastDay}&apikey=${key}`),
    ]);

    const econData = econRes.ok ? await econRes.json() : [];
    const earningsData = earningsRes.ok ? await earningsRes.json() : [];

    const econEvents = (Array.isArray(econData) ? econData : [])
      .filter((e) => {
        if (!e.date) return false;
        const d = new Date(e.date);
        const il = impactLevel(e.impact);
        return (
          d.getFullYear() === year &&
          d.getMonth() === now.getMonth() &&
          (il === 'high' || il === 'medium')
        );
      })
      .slice(0, 8)
      .map((e, i) => {
        const d = new Date(e.date);
        const timeStr = d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        const il = impactLevel(e.impact);
        const isHigh = il === 'high';
        return {
          id: `econ-${i}`,
          type: isHigh ? 'fed' : 'economic',
          icon: isHigh ? '🏛️' : '📈',
          title: e.event,
          day: d.getDate(),
          time: timeStr,
          color: isHigh ? '#3b82f6' : '#6366f1',
          country: e.country,
          impact: e.impact,
          actual: e.actual,
          estimate: e.estimate,
          previous: e.previous,
        };
      });

    const earningsEvents = (Array.isArray(earningsData) ? earningsData : [])
      .filter((e) => e.date && e.symbol)
      .slice(0, 6)
      .map((e, i) => {
        const d = new Date(e.date);
        return {
          id: `earn-${i}`,
          type: 'earnings',
          icon: '📊',
          title: `${e.symbol} Earnings`,
          day: d.getDate(),
          time: '4:30 PM',
          color: '#10b981',
          symbol: e.symbol,
          epsEstimated: e.epsEstimated,
          revenueEstimated: e.revenueEstimated,
        };
      });

    const combined = [...econEvents, ...earningsEvents]
      .sort((a, b) => a.day - b.day)
      .slice(0, 12);

    return NextResponse.json(
      { events: combined },
      { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message, events: [] },
      { status: 500 }
    );
  }
}
