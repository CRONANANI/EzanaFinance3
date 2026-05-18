import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';
import { fetchAV, getAlphaVantageApiKey, fetchAllBulkQuotesAlpha } from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

async function fetchAvDailyPrices(ticker) {
  try {
    const data = await fetchAV(
      { function: 'TIME_SERIES_DAILY_ADJUSTED', symbol: ticker, outputsize: 'compact' },
      300,
    );

    const ts = data?.['Time Series (Daily)'];
    if (!ts || typeof ts !== 'object') return {};

    const prices = {};
    for (const [date, ohlc] of Object.entries(ts)) {
      const close = parseFloat(ohlc?.['5. adjusted close'] ?? ohlc?.['4. close']);
      if (Number.isFinite(close)) prices[date] = close;
    }
    return prices;
  } catch (err) {
    console.warn(`[portfolio/week-series] AV daily prices for ${ticker}:`, err?.message);
    return {};
  }
}

async function fetchCurrentQuotes(tickers) {
  if (!tickers.length || !getAlphaVantageApiKey()) return {};
  try {
    const quotes = await fetchAllBulkQuotesAlpha(tickers);
    const map = {};
    for (const [sym, q] of Object.entries(quotes)) {
      if (q?.price != null && Number.isFinite(q.price) && q.price > 0) {
        map[sym] = q.price;
      }
    }
    return map;
  } catch {
    return {};
  }
}

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const monday = startOfWeekNy();
    const today = todayNy();

    const { data: snapshots } = await supabaseAdmin
      .from('portfolio_value_snapshots')
      .select('snapshot_date, total_value, mock_value')
      .eq('user_id', user.id)
      .gte('snapshot_date', monday)
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

    const tickers = [...new Set(positions.map((p) => p.ticker.replace(/-/g, '')))];

    const [historicalByTicker, currentQuotes] = await Promise.all([
      Promise.all(tickers.map(async (t) => ({ ticker: t, prices: await fetchAvDailyPrices(t) }))),
      fetchCurrentQuotes(tickers),
    ]);

    const priceMap = {};
    for (const { ticker, prices } of historicalByTicker) {
      priceMap[ticker] = prices;
    }

    const positionsNorm = positions.map((p) => ({
      ...p,
      ticker: p.ticker.replace(/-/g, ''),
    }));

    const dailyValues = {};
    for (let i = 0; i < 5; i++) {
      const ymd = addDays(monday, i);
      if (ymd > today) break;

      let dayTotal = cash;
      for (const pos of positionsNorm) {
        let price;

        if (ymd === today && currentQuotes[pos.ticker] != null) {
          price = currentQuotes[pos.ticker];
        } else if (priceMap[pos.ticker]?.[ymd] != null) {
          price = priceMap[pos.ticker][ymd];
        } else {
          const dates = Object.keys(priceMap[pos.ticker] || {}).sort();
          const closest = dates.filter((d) => d <= ymd).pop();
          price = closest ? priceMap[pos.ticker][closest] : pos.avgCost;
        }

        dayTotal += pos.shares * price;
      }
      dailyValues[ymd] = dayTotal;
    }

    let baseline = dailyValues[monday];
    if (baseline == null || baseline <= 0) {
      const sortedDays = Object.keys(dailyValues).sort();
      baseline = sortedDays.length ? dailyValues[sortedDays[0]] : null;
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

    return NextResponse.json({ ok: true, series: liveSeries, source: 'live_av' });
  } catch (e) {
    console.error('[portfolio/week-series]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
