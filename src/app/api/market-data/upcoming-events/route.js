import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY || process.env.FMP_API_KEY;
const FMP_STABLE = 'https://financialmodelingprep.com/stable';

// Short cache (5 min) — limits stale same-day responses from CDN/edge
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};

/** Parse "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS" as local time */
function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim().replace('T', ' ');
  const [datePart, timePart] = s.split(' ');
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return null;
  if (timePart) {
    const [hh = 0, mm = 0] = timePart.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm);
  }
  return new Date(y, m - 1, d);
}

export async function GET() {
  try {
    if (!FMP_KEY) {
      return NextResponse.json({ events: [] }, { headers: CACHE_HEADERS });
    }

    const now = new Date();
    const year = now.getFullYear();
    const monthIdx = now.getMonth();
    const month = String(monthIdx + 1).padStart(2, '0');
    const todayDay = now.getDate();
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

    // ── THE FIX: query FROM TODAY, not from the 1st of the month ──────────
    const fromDay = `${year}-${month}-${String(todayDay).padStart(2, '0')}`;
    const lastDay = `${year}-${month}-${String(daysInMonth).padStart(2, '0')}`;
    const key = encodeURIComponent(FMP_KEY);

    // cache: 'no-store' bypasses Next.js internal fetch cache entirely
    const [econRes, earningsRes] = await Promise.all([
      fetch(`${FMP_STABLE}/economic-calendar?from=${fromDay}&to=${lastDay}&apikey=${key}`, { cache: 'no-store' }),
      fetch(`${FMP_STABLE}/earnings-calendar?from=${fromDay}&to=${lastDay}&apikey=${key}`, { cache: 'no-store' }),
    ]);

    const econRaw = econRes.ok ? await econRes.json() : [];
    const earningsRaw = earningsRes.ok ? await earningsRes.json() : [];

    // Only today or future events
    const todayMidnight = new Date(year, monthIdx, todayDay, 0, 0, 0);

    // ── Economic events ───────────────────────────────────────────────────
    const econEvents = (Array.isArray(econRaw) ? econRaw : [])
      .filter((e) => {
        if (!e.date) return false;
        const d = parseLocalDate(e.date);
        if (!d) return false;
        const imp = String(e.impact ?? '').toLowerCase();
        return (
          d >= todayMidnight &&
          d.getFullYear() === year &&
          d.getMonth() === monthIdx &&
          (imp === 'high' || imp === 'medium')
        );
      })
      .sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date))
      .slice(0, 8)
      .map((e, i) => {
        const d = parseLocalDate(e.date);
        const isHigh = String(e.impact ?? '').toLowerCase() === 'high';
        const timeStr = String(e.date).includes(' ')
          ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          : '8:30 AM';
        return {
          id: `econ-${i}`,
          type: isHigh ? 'fed' : 'economic',
          icon: isHigh ? '🏛️' : '📈',
          title: e.event,
          fullDate: String(e.date).split(' ')[0].split('T')[0], // "YYYY-MM-DD" — used by frontend for display
          day: d.getDate(),
          month: d.getMonth(),
          year: d.getFullYear(),
          time: timeStr,
          color: isHigh ? '#3b82f6' : '#6366f1',
          country: e.country ?? null,
          impact: e.impact ?? null,
          actual: e.actual ?? null,
          estimate: e.estimate ?? null,
          previous: e.previous ?? null,
        };
      });

    // ── Earnings events ───────────────────────────────────────────────────
    const earningsEvents = (Array.isArray(earningsRaw) ? earningsRaw : [])
      .filter((e) => {
        if (!e.date || !e.symbol) return false;
        const d = parseLocalDate(e.date);
        if (!d) return false;
        return (
          d >= todayMidnight &&
          d.getFullYear() === year &&
          d.getMonth() === monthIdx
        );
      })
      .sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date))
      .slice(0, 6)
      .map((e, i) => {
        const d = parseLocalDate(e.date);
        return {
          id: `earn-${i}`,
          type: 'earnings',
          icon: '📊',
          title: `${e.symbol} Earnings`,
          fullDate: String(e.date).split(' ')[0].split('T')[0],
          day: d.getDate(),
          month: d.getMonth(),
          year: d.getFullYear(),
          time: 'After Close',
          color: '#10b981',
          symbol: e.symbol,
          epsEstimated: e.epsEstimated ?? null,
          revenueEstimated: e.revenueEstimated ?? null,
        };
      });

    // ── Merge, sort by full date, cap at 12 ───────────────────────────────
    const combined = [...econEvents, ...earningsEvents]
      .sort((a, b) => {
        const da = parseLocalDate(a.fullDate);
        const db = parseLocalDate(b.fullDate);
        return (da?.getTime() ?? 0) - (db?.getTime() ?? 0);
      })
      .slice(0, 12);

    return NextResponse.json({ events: combined }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('[upcoming-events]', error);
    return NextResponse.json({ error: error.message, events: [] }, { status: 500 });
  }
}
