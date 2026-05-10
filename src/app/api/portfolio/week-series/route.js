import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FMP_KEY = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY;
const FMP_BASE = 'https://financialmodelingprep.com/stable';

/* ── NY timezone helpers ── */
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
    timeZone: 'America/New_York',
    weekday: 'long',
  });
}
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

/* ── Extract positions from mock_portfolios JSONB ── */
function extractPositions(portfolio) {
  if (!portfolio || typeof portfolio !== 'object') return [];
  const positions = portfolio.positions;
  const result = [];

  if (positions && typeof positions === 'object' && !Array.isArray(positions)) {
    for (const [ticker, p] of Object.entries(positions)) {
      const shares = Number(p?.shares ?? p?.qty ?? 0);
      if (shares <= 0) continue;
      const avgCost = Number(p?.avgCost ?? p?.costBasis ?? 0);
      result.push({ ticker: String(ticker).toUpperCase(), shares, avgCost });
    }
  } else if (Array.isArray(positions)) {
    for (const p of positions) {
      const ticker = (p?.ticker ?? p?.symbol ?? '').toString().toUpperCase();
      const shares = Number(p?.shares ?? p?.qty ?? 0);
      if (!ticker || shares <= 0) continue;
      const avgCost = Number(p?.avgCost ?? p?.costBasis ?? 0);
      result.push({ ticker, shares, avgCost });
    }
  }
  return result;
}

function parseQuotePrice(q) {
  if (q?.price == null) return null;
  const raw = q.price;
  const p = typeof raw === 'number' ? raw : parseFloat(String(raw));
  return Number.isFinite(p) ? p : null;
}

/* ── Fetch current quotes from FMP ── */
async function fetchQuotes(tickers) {
  if (!FMP_KEY || tickers.length === 0) return {};
  try {
    const symbols = tickers.join(',');
    const res = await fetch(
      `${FMP_BASE}/quote?symbol=${encodeURIComponent(symbols)}&apikey=${encodeURIComponent(FMP_KEY)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return {};
    const data = await res.json();
    const map = {};
    for (const q of Array.isArray(data) ? data : []) {
      const sym = q?.symbol && String(q.symbol).toUpperCase();
      const price = parseQuotePrice(q);
      if (sym && price != null) map[sym] = price;
    }
    return map;
  } catch {
    return {};
  }
}

/* ── Fetch historical daily close for a specific date range from FMP ── */
async function fetchHistoricalCloses(tickers, fromDate, toDate) {
  if (!FMP_KEY || tickers.length === 0) return {};
  const result = {};
  for (const ticker of tickers) {
    try {
      const res = await fetch(
        `${FMP_BASE}/historical-price-eod/light?symbol=${encodeURIComponent(ticker)}&from=${fromDate}&to=${toDate}&apikey=${encodeURIComponent(FMP_KEY)}`,
        { cache: 'no-store' },
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data)) {
        result[ticker] = {};
        for (const row of data) {
          if (row?.date && row.close != null) {
            const close = typeof row.close === 'number' ? row.close : parseFloat(String(row.close));
            if (Number.isFinite(close)) result[ticker][row.date] = close;
          }
        }
      }
    } catch {
      /* skip */
    }
  }
  return result;
}

/**
 * GET /api/portfolio/week-series
 *
 * Computes the user's portfolio weekly performance using LIVE prices.
 * Returns % change from Monday's close for each weekday.
 */
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const monday = startOfWeekNy();
    const friday = addDays(monday, 4);
    const today = todayNy();

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

    if (realPoints >= 2) {
      const baseline = slots.find((s) => s.value != null)?.value;
      const seriesWithPct = slots.map((s) => {
        if (s.value == null || baseline == null) return { ...s, pct: null };
        const pct = ((s.value - baseline) / baseline) * 100;
        return { ...s, pct: parseFloat(pct.toFixed(3)) };
      });
      return NextResponse.json({ ok: true, series: seriesWithPct, source: 'db' });
    }

    const { data: mockRow } = await supabaseAdmin
      .from('mock_portfolios')
      .select('portfolio')
      .eq('user_id', user.id)
      .maybeSingle();

    const portfolio = mockRow?.portfolio;
    const positions = extractPositions(portfolio);
    const cash = Number(portfolio?.cash ?? 0) || 0;

    if (positions.length === 0) {
      const empty = slots.map((s) => ({ ...s, pct: null }));
      return NextResponse.json({ ok: true, series: empty, source: 'empty' });
    }

    const tickers = [...new Set(positions.map((p) => p.ticker))];

    const [historicalPrices, currentQuotes] = await Promise.all([
      fetchHistoricalCloses(tickers, monday, today),
      fetchQuotes(tickers),
    ]);

    const dailyValues = {};
    for (let i = 0; i < 5; i++) {
      const ymd = addDays(monday, i);
      if (ymd > today) break;

      let dayTotal = cash;
      for (const pos of positions) {
        let price;
        if (ymd === today && currentQuotes[pos.ticker] != null) {
          price = currentQuotes[pos.ticker];
        } else if (historicalPrices[pos.ticker]?.[ymd] != null) {
          price = historicalPrices[pos.ticker][ymd];
        } else {
          const dates = Object.keys(historicalPrices[pos.ticker] || {}).sort();
          const closest = dates.filter((d) => d <= ymd).pop();
          price = closest ? historicalPrices[pos.ticker][closest] : pos.avgCost;
        }
        dayTotal += pos.shares * price;
      }
      dailyValues[ymd] = dayTotal;
    }

    let baseline = dailyValues[monday];
    if (baseline == null || baseline <= 0) {
      const sortedDays = Object.keys(dailyValues).sort();
      const first = sortedDays[0];
      baseline = first != null ? dailyValues[first] : null;
    }
    if (baseline == null || baseline <= 0) {
      const empty = slots.map((s) => ({ ...s, pct: null }));
      return NextResponse.json({ ok: true, series: empty, source: 'empty' });
    }

    const liveSeries = slots.map((s) => {
      const val = dailyValues[s.ymd];
      if (val == null) return { ...s, pct: null };
      const pct = ((val - baseline) / baseline) * 100;
      return { ...s, value: parseFloat(val.toFixed(2)), pct: parseFloat(pct.toFixed(3)) };
    });

    return NextResponse.json({ ok: true, series: liveSeries, source: 'live' });
  } catch (e) {
    console.error('[portfolio/week-series]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
