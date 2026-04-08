import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY || process.env.FMP_API_KEY;
const FMP_STABLE = 'https://financialmodelingprep.com/stable';

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' };

/** Parse a date string safely as LOCAL time to avoid UTC off-by-one */
function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  // "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS"
  const [datePart, timePart] = String(dateStr).trim().split(' ');
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return null;
  if (timePart) {
    const parts = timePart.split(':').map(Number);
    const hh = parts[0] ?? 0;
    const mm = parts[1] ?? 0;
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
    const monthIdx = now.getMonth(); // 0-based
    const month = String(monthIdx + 1).padStart(2, '0');
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const pad = (n) => String(n).padStart(2, '0');
    /** From today through end of month only (not start of month) */
    const firstDay = `${year}-${month}-${pad(now.getDate())}`;
    const lastDay = `${year}-${month}-${pad(daysInMonth)}`;
    const startOfToday = new Date(year, monthIdx, now.getDate());
    startOfToday.setHours(0, 0, 0, 0);
    const key = encodeURIComponent(FMP_KEY);

    const [econRes, earningsRes] = await Promise.all([
      fetch(`${FMP_STABLE}/economic-calendar?from=${firstDay}&to=${lastDay}&apikey=${key}`),
      fetch(`${FMP_STABLE}/earnings-calendar?from=${firstDay}&to=${lastDay}&apikey=${key}`),
    ]);

    const econRaw = econRes.ok ? await econRes.json() : [];
    const earningsRaw = earningsRes.ok ? await earningsRes.json() : [];

    // ── Economic events ────────────────────────────────────────────────────
    const econEvents = (Array.isArray(econRaw) ? econRaw : [])
      .filter((e) => {
        if (!e.date) return false;
        const d = parseLocalDate(e.date);
        if (!d) return false;
        if (d < startOfToday) return false;
        const imp = String(e.impact ?? '').toLowerCase();
        return (
          d.getFullYear() === year &&
          d.getMonth() === monthIdx &&
          (imp === 'high' || imp === 'medium')
        );
      })
      .sort((a, b) => {
        const da = parseLocalDate(a.date);
        const db = parseLocalDate(b.date);
        return (da?.getTime() ?? 0) - (db?.getTime() ?? 0);
      })
      .slice(0, 8)
      .map((e, i) => {
        const d = parseLocalDate(e.date);
        const isHigh = String(e.impact ?? '').toLowerCase() === 'high';
        const timeStr =
          e.date && String(e.date).includes(' ')
            ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
            : '8:30 AM'; // economic releases with no time default to typical release time
        return {
          id: `econ-${i}`,
          type: isHigh ? 'fed' : 'economic',
          icon: isHigh ? '🏛️' : '📈',
          title: e.event,
          day: d.getDate(),
          monthIdx: d.getMonth(),
          dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          time: timeStr,
          color: isHigh ? '#3b82f6' : '#6366f1',
          country: e.country,
          impact: e.impact,
          actual: e.actual ?? null,
          estimate: e.estimate ?? null,
          previous: e.previous ?? null,
        };
      });

    // ── Earnings events ────────────────────────────────────────────────────
    const earningsEvents = (Array.isArray(earningsRaw) ? earningsRaw : [])
      .filter((e) => {
        if (!e.date || !e.symbol) return false;
        const d = parseLocalDate(e.date);
        if (!d) return false;
        if (d < startOfToday) return false;
        return d.getFullYear() === year && d.getMonth() === monthIdx;
      })
      .sort((a, b) => {
        const da = parseLocalDate(a.date);
        const db = parseLocalDate(b.date);
        return (da?.getTime() ?? 0) - (db?.getTime() ?? 0);
      })
      .slice(0, 6)
      .map((e, i) => {
        const d = parseLocalDate(e.date);
        return {
          id: `earn-${i}`,
          type: 'earnings',
          icon: '📊',
          title: `${e.symbol} Earnings`,
          day: d.getDate(),
          monthIdx: d.getMonth(),
          dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          time: '4:30 PM',
          color: '#10b981',
          symbol: e.symbol,
          epsEstimated: e.epsEstimated ?? null,
          revenueEstimated: e.revenueEstimated ?? null,
        };
      });

    // ── Merge, sort by day, cap at 12 ──────────────────────────────────────
    const combined = [...econEvents, ...earningsEvents]
      .sort((a, b) => a.day - b.day)
      .slice(0, 12);

    return NextResponse.json({ events: combined }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('[upcoming-events]', error);
    return NextResponse.json({ error: error.message, events: [] }, { status: 500 });
  }
}
