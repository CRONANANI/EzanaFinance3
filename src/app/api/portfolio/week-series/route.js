import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* NY timezone helpers — match the index-week endpoint's date logic */
function todayNy() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}
function addDays(ymd, delta) {
  const [Y, M, D] = ymd.split('-').map(Number);
  const ms = Date.UTC(Y, M - 1, D, 12) + delta * 86_400_000;
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}
function dowNy(ymd) {
  const [Y, M, D] = ymd.split('-').map(Number);
  return new Date(Date.UTC(Y, M - 1, D, 12)).toLocaleDateString('en-US', {
    timeZone: 'America/New_York', weekday: 'long',
  });
}

/**
 * Get the Monday of the current NY week.
 */
function startOfWeekNy() {
  let cur = todayNy();
  for (let i = 0; i < 10; i++) {
    if (dowNy(cur) === 'Monday') break;
    cur = addDays(cur, -1);
  }
  return cur;
}

const DAY_LABELS = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
};

/** Cost basis + cash from mock portfolio JSONB (`mock_portfolios.portfolio`). */
function mockPortfolioCostPlusCash(portfolio) {
  if (!portfolio || typeof portfolio !== 'object') return null;
  const cash = Number(portfolio.cash ?? 0);
  const cashNum = Number.isFinite(cash) ? cash : 0;
  const positions = portfolio.positions;
  let costBasis = 0;
  let hasPosition = false;
  if (positions && typeof positions === 'object' && !Array.isArray(positions)) {
    for (const p of Object.values(positions)) {
      const qty = Number(p?.shares ?? p?.qty ?? 0) || 0;
      if (qty <= 0) continue;
      const avg = Number(p?.avgCost ?? p?.costBasis ?? 0) || 0;
      costBasis += qty * avg;
      hasPosition = true;
    }
  } else if (Array.isArray(positions)) {
    for (const p of positions) {
      const qty = Number(p?.shares ?? p?.qty ?? 0) || 0;
      if (qty <= 0) continue;
      const avg = Number(p?.avgCost ?? p?.costBasis ?? 0) || 0;
      costBasis += qty * avg;
      hasPosition = true;
    }
  }
  if (!hasPosition && cashNum <= 0) return null;
  return costBasis + cashNum;
}

/**
 * GET /api/portfolio/week-series
 *
 * Returns the current user's portfolio weekly performance, normalized as
 * percent change from Monday's opening value. 5 weekday points (Mon-Fri).
 *
 * Response shape (matches /api/market/index-week single-series shape):
 *   { ok: true, series: [{ day, ymd, value, pct }], source: 'db' | 'empty' | 'computed' }
 */
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const monday = startOfWeekNy();
    const friday = addDays(monday, 4);

    const { data: snapshots } = await supabaseAdmin
      .from('portfolio_value_snapshots')
      .select('snapshot_date, total_value, mock_value')
      .eq('user_id', user.id)
      .gte('snapshot_date', monday)
      .lte('snapshot_date', friday)
      .order('snapshot_date', { ascending: true });

    const slotMap = new Map();
    for (const row of snapshots || []) {
      const raw = row.total_value ?? row.mock_value;
      const value = typeof raw === 'string' ? parseFloat(raw) : raw;
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        slotMap.set(row.snapshot_date, value);
      }
    }

    const slots = [];
    for (let i = 0; i < 5; i++) {
      const ymd = addDays(monday, i);
      slots.push({
        ymd,
        day: DAY_LABELS[dowNy(ymd)] || ymd.slice(5),
        value: slotMap.get(ymd) ?? null,
      });
    }

    const realPoints = slots.filter((s) => s.value != null).length;

    if (realPoints < 2) {
      const { data: mockRow } = await supabaseAdmin
        .from('mock_portfolios')
        .select('portfolio')
        .eq('user_id', user.id)
        .maybeSingle();

      const costPlusCash = mockPortfolioCostPlusCash(mockRow?.portfolio);

      if (costPlusCash == null) {
        const empty = slots.map((s) => ({ ...s, pct: null }));
        return NextResponse.json({ ok: true, series: empty, source: 'empty' });
      }

      if (realPoints === 1) {
        const baseline = slots.find((s) => s.value != null)?.value;
        const seriesWithPct = slots.map((s) => {
          if (s.value == null || baseline == null) return { ...s, pct: null };
          const pct = ((s.value - baseline) / baseline) * 100;
          return { ...s, pct: parseFloat(pct.toFixed(3)) };
        });
        return NextResponse.json({ ok: true, series: seriesWithPct, source: 'db' });
      }

      const todayYmd = todayNy();
      const baselineSeries = slots.map((s) => {
        if (s.ymd > todayYmd) return { ...s, pct: null };
        return { ...s, value: costPlusCash, pct: 0 };
      });
      return NextResponse.json({ ok: true, series: baselineSeries, source: 'computed' });
    }

    const baseline = slots.find((s) => s.value != null)?.value;
    const seriesWithPct = slots.map((s) => {
      if (s.value == null || baseline == null) return { ...s, pct: null };
      const pct = ((s.value - baseline) / baseline) * 100;
      return { ...s, pct: parseFloat(pct.toFixed(3)) };
    });

    return NextResponse.json({ ok: true, series: seriesWithPct, source: 'db' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
