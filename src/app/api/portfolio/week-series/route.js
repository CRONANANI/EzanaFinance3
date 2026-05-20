import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';
import { fetchAV, getAlphaVantageApiKey, fetchAllBulkQuotesAlpha } from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* ── Date helpers (NY timezone) ── */
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

function periodToDays(period) {
  return { '1D': 1, '7D': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, ALL: 7300 }[period] || 7;
}

function getStartDate(period) {
  const d = new Date();
  d.setDate(d.getDate() - periodToDays(period));
  return d.toISOString().split('T')[0];
}

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
      const openedAt = p?.openedAt ?? p?.createdAt ?? p?.date ?? null;
      result.push({ ticker: String(ticker).toUpperCase(), shares, avgCost, openedAt });
    }
  } else if (Array.isArray(positions)) {
    for (const p of positions) {
      const ticker = (p?.ticker ?? p?.symbol ?? '').toString().toUpperCase();
      const shares = Number(p?.shares ?? p?.qty ?? 0);
      if (!ticker || shares <= 0) continue;
      const avgCost = Number(p?.avgCost ?? p?.costBasis ?? 0);
      const openedAt = p?.openedAt ?? p?.createdAt ?? p?.date ?? null;
      result.push({ ticker, shares, avgCost, openedAt });
    }
  }
  return result;
}

/* ── Fetch daily adjusted close from AV (cached 5 min) ── */
async function fetchAvDailyPrices(ticker) {
  try {
    const data = await fetchAV(
      { function: 'TIME_SERIES_DAILY_ADJUSTED', symbol: ticker, outputsize: 'full' },
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
    console.warn(`[portfolio/week-series] AV daily for ${ticker}:`, err?.message);
    return {};
  }
}

/* ── Fetch current live quotes from AV ── */
async function fetchCurrentQuotes(tickers) {
  if (!tickers.length || !getAlphaVantageApiKey()) return {};
  try {
    const quotes = await fetchAllBulkQuotesAlpha(tickers);
    const map = {};
    for (const [sym, q] of Object.entries(quotes)) {
      if (q?.price > 0) map[sym] = q.price;
    }
    return map;
  } catch {
    return {};
  }
}

/* ── Aggregation helpers ── */
function aggregateByWeek(entries, maxWeeks = 4) {
  const weeks = new Map();
  for (const e of entries) {
    const d = new Date(`${e.ymd}T12:00:00Z`);
    const wd = d.getUTCDay();
    const off = wd === 0 ? -6 : 1 - wd;
    d.setUTCDate(d.getUTCDate() + off);
    const key = d.toISOString().slice(0, 10);
    weeks.set(key, e);
  }
  const sorted = [...weeks.values()].sort((a, b) => a.ymd.localeCompare(b.ymd));
  return sorted.slice(-maxWeeks).map((e, i) => ({ ...e, day: `Week ${i + 1}` }));
}

function aggregateByMonth(entries) {
  const months = new Map();
  for (const e of entries) months.set(e.ymd.slice(0, 7), e);
  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, e]) => {
      const d = new Date(`${e.ymd}T12:00:00Z`);
      return {
        ...e,
        day: d.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short' }),
      };
    });
}

function aggregateByYear(entries) {
  const years = new Map();
  for (const e of entries) years.set(e.ymd.slice(0, 4), e);
  return [...years.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearKey, e]) => ({ ...e, day: yearKey }));
}

/**
 * GET /api/portfolio/week-series?period=7D|1M|3M|6M|1Y|ALL
 *
 * Computes the user's mock portfolio performance for the requested period.
 * Returns % change from baseline for each aggregated data point.
 */
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7D';
    const today = todayNy();
    const startDate = period === '7D' ? startOfWeekNy() : getStartDate(period);

    // Read portfolio
    const { data: mockRow } = await supabaseAdmin
      .from('mock_portfolios')
      .select('portfolio')
      .eq('user_id', user.id)
      .maybeSingle();

    const portfolio = mockRow?.portfolio;
    const positions = extractPositions(portfolio);
    const cash = Number(portfolio?.cash ?? 0) || 0;

    // Earliest buy per ticker from mock_trades (for positions missing openedAt)
    const { data: trades } = await supabaseAdmin
      .from('mock_trades')
      .select('ticker, trade_type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    const openedByTicker = {};
    for (const t of trades || []) {
      if (t.trade_type !== 'buy') continue;
      const sym = String(t.ticker || '')
        .toUpperCase()
        .trim();
      if (sym && !openedByTicker[sym]) openedByTicker[sym] = t.created_at;
    }
    for (const pos of positions) {
      if (!pos.openedAt && openedByTicker[pos.ticker]) {
        pos.openedAt = openedByTicker[pos.ticker];
      }
    }

    if (positions.length === 0) {
      return NextResponse.json({ ok: true, series: [], source: 'empty', period });
    }

    const tickers = [...new Set(positions.map((p) => p.ticker))];

    // Fetch historical + live prices in parallel
    const [priceResults, currentQuotes] = await Promise.all([
      Promise.all(tickers.map(async (t) => ({ ticker: t, prices: await fetchAvDailyPrices(t) }))),
      fetchCurrentQuotes(tickers),
    ]);

    const priceMap = {};
    for (const { ticker, prices } of priceResults) {
      priceMap[ticker] = prices;
    }

    // Find the nearest trading date BEFORE the period start as baseline
    let baselineDate = startDate;
    for (const ticker of tickers) {
      const dates = Object.keys(priceMap[ticker] || {}).sort();
      const prior = dates.filter((d) => d < startDate);
      if (prior.length > 0) {
        const candidate = prior[prior.length - 1];
        if (candidate < baselineDate || baselineDate === startDate) {
          baselineDate = candidate;
        }
      }
    }

    // Collect all trading dates including the baseline date
    const allDatesSet = new Set();
    for (const ticker of tickers) {
      for (const date of Object.keys(priceMap[ticker] || {})) {
        if (date >= baselineDate && date <= today) allDatesSet.add(date);
      }
    }
    // Always include today
    allDatesSet.add(today);

    const allDates = [...allDatesSet].sort();
    if (allDates.length === 0) {
      return NextResponse.json({ ok: true, series: [], source: 'empty', period });
    }

    // Compute portfolio value for each date
    const dailyEntries = [];
    for (const ymd of allDates) {
      let dayTotal = cash;

      for (const pos of positions) {
        // Skip positions that didn't exist yet on this date
        if (pos.openedAt && ymd < pos.openedAt.slice(0, 10)) {
          // Position not yet opened — use cash equivalent (avgCost × shares)
          dayTotal += pos.shares * pos.avgCost;
          continue;
        }

        let price;
        if (ymd === today && currentQuotes[pos.ticker] != null) {
          price = currentQuotes[pos.ticker];
        } else if (priceMap[pos.ticker]?.[ymd] != null) {
          price = priceMap[pos.ticker][ymd];
        } else {
          // Nearest prior date fallback
          const dates = Object.keys(priceMap[pos.ticker] || {}).sort();
          const closest = dates.filter((d) => d <= ymd).pop();
          price = closest ? priceMap[pos.ticker][closest] : pos.avgCost;
        }
        dayTotal += pos.shares * price;
      }

      const d = new Date(`${ymd}T12:00:00Z`);
      dailyEntries.push({
        ymd,
        day: d.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' }),
        value: dayTotal,
      });
    }

    if (dailyEntries.length === 0) {
      return NextResponse.json({ ok: true, series: [], source: 'empty', period });
    }

    // Aggregate based on period
    let aggregated;
    if (period === '1D') {
      aggregated = dailyEntries.slice(-1);
    } else if (period === '7D') {
      // Last 5 trading days (Mon–Fri of current week)
      const monday = startOfWeekNy();
      const weekDays = dailyEntries.filter((e) => e.ymd >= monday);
      aggregated = weekDays.slice(-5);
    } else if (period === '1M') {
      aggregated = aggregateByWeek(dailyEntries, 4);
    } else if (period === '3M') {
      aggregated = aggregateByMonth(dailyEntries).slice(-3);
    } else if (period === '6M') {
      aggregated = aggregateByMonth(dailyEntries).slice(-6);
    } else if (period === '1Y') {
      aggregated = aggregateByMonth(dailyEntries).slice(-12);
    } else if (period === 'ALL') {
      aggregated = aggregateByYear(dailyEntries);
    } else {
      aggregated = dailyEntries;
    }

    if (aggregated.length === 0) {
      return NextResponse.json({ ok: true, series: [], source: 'empty', period });
    }

    // Use the value at the baseline date (before period start) as anchor
    // This ensures the first point shows actual return from period start, not 0%
    const baselineEntry = dailyEntries.find((e) => e.ymd <= startDate) || dailyEntries[0];
    const baselineValue = baselineEntry.value;

    const series = aggregated.map((e) => {
      const pct = baselineValue > 0 ? ((e.value - baselineValue) / baselineValue) * 100 : 0;
      return {
        day: e.day,
        ymd: e.ymd,
        value: parseFloat(e.value.toFixed(2)),
        pct: parseFloat(pct.toFixed(3)),
      };
    });

    return NextResponse.json({ ok: true, series, source: 'live_av', period });
  } catch (e) {
    console.error('[portfolio/week-series]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
