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

/**
 * GET /api/portfolio/week-series
 *
 * Returns the current user's portfolio weekly performance, normalized as
 * percent change from Monday's opening value. 5 weekday points (Mon-Fri).
 *
 * Response shape (matches /api/market/index-week single-series shape):
 *   { ok: true, series: [{ day, ymd, value, pct }], source: 'db' | 'synthetic' }
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
      const seed = user.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const rand = (n) => {
        const x = Math.sin(seed * 1000 + n) * 10000;
        return x - Math.floor(x);
      };
      const synth = slots.map((s, i) => ({
        ...s,
        pct: parseFloat(((rand(i) - 0.5) * 1.4).toFixed(3)),
      }));
      synth[0].pct = 0;
      return NextResponse.json({ ok: true, series: synth, source: 'synthetic' });
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
