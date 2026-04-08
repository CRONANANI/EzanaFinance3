import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY =
  process.env.FMP_API_KEY ||
  process.env.NEXT_PUBLIC_FMP_API_KEY;
const FMP_BASE = 'https://financialmodelingprep.com/stable';

// The 5 indices we display — FMP uses caret-prefixed symbols for indices
const INDICES = {
  spx:  { symbol: '^GSPC', name: 'S&P 500' },
  rut:  { symbol: '^RUT',  name: 'Russell 2000' },
  dji:  { symbol: '^DJI',  name: 'Dow Jones' },
  ixic: { symbol: '^IXIC', name: 'NASDAQ' },
  nya:  { symbol: '^NYA',  name: 'NYSE Composite' },
};

const INDEX_KEYS = ['spx', 'rut', 'dji', 'ixic', 'nya'];

/** Get current NY date as YYYY-MM-DD */
function todayNy() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/** Add delta days to a YYYY-MM-DD string */
function addDays(ymd, delta) {
  const [Y, M, D] = ymd.split('-').map(Number);
  const ms = Date.UTC(Y, M - 1, D, 12) + delta * 86_400_000;
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/** Day-of-week name in NY timezone */
function dowNy(ymd) {
  const [Y, M, D] = ymd.split('-').map(Number);
  return new Date(Date.UTC(Y, M - 1, D, 12)).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
  });
}

/** Returns [{label:'Mon',ymd:'2025-04-07'}, ... Fri] for the current week */
function weekSlots() {
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  let cur = todayNy();
  for (let i = 0; i < 10; i++) {
    if (dowNy(cur) === 'Monday') break;
    cur = addDays(cur, -1);
  }
  return DAY_LABELS.map((label, i) => ({ label, ymd: addDays(cur, i) }));
}

/**
 * Fetch FMP /stable/quote for a single symbol.
 * Returns the first item in the array, or null on failure.
 */
async function fetchQuote(symbol) {
  const url = `${FMP_BASE}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(FMP_KEY)}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[index-week] quote ${symbol} HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    const item = Array.isArray(data) ? data[0] : data;
    const price =
      item?.price != null ? (typeof item.price === 'number' ? item.price : parseFloat(String(item.price))) : NaN;
    if (!item || !Number.isFinite(price)) return null;
    return { ...item, price };
  } catch (err) {
    console.error(`[index-week] quote ${symbol}:`, err.message);
    return null;
  }
}

/**
 * Fetch FMP /stable/historical-price-eod/full for a symbol.
 * Returns a Map<ymd, closePrice> for the current week's dates.
 * FMP may return a JSON array or { historical: [...] }.
 */
async function fetchWeeklyCloses(symbol, slots) {
  const fromYmd = slots[0].ymd;
  // Fetch a 14-day window to ensure we capture the week even if there are gaps
  const toYmd   = addDays(fromYmd, 13);
  const url = `${FMP_BASE}/historical-price-eod/full?symbol=${encodeURIComponent(symbol)}&from=${fromYmd}&to=${toYmd}&apikey=${encodeURIComponent(FMP_KEY)}`;
  const map = new Map();
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[index-week] historical ${symbol} HTTP ${res.status}`);
      return map;
    }
    const data = await res.json();
    const hist = Array.isArray(data)
      ? data
      : Array.isArray(data?.historical)
        ? data.historical
        : [];
    for (const bar of hist) {
      if (bar.date && typeof bar.close === 'number') {
        map.set(bar.date, bar.close);
      }
    }
  } catch (err) {
    console.error(`[index-week] historical ${symbol}:`, err.message);
  }
  return map;
}

export async function GET() {
  if (!FMP_KEY) {
    const emptySlots = weekSlots();
    return NextResponse.json({
      ok: false,
      error: 'no_key',
      indices: {},
      slots: emptySlots.map((s) => s.label),
    });
  }

  const slots  = weekSlots();
  const todayK = todayNy();

  // Fetch all quotes and historical closes in parallel
  const [quotes, histMaps] = await Promise.all([
    Promise.all(INDEX_KEYS.map((k) => fetchQuote(INDICES[k].symbol))),
    Promise.all(INDEX_KEYS.map((k) => fetchWeeklyCloses(INDICES[k].symbol, slots))),
  ]);

  const indices = {};

  for (let i = 0; i < INDEX_KEYS.length; i++) {
    const key   = INDEX_KEYS[i];
    const meta  = INDICES[key];
    const quote = quotes[i];
    const hist  = histMaps[i];

    // Build Mon–Fri series
    // Each slot gets the close price for that day (from historical)
    // If today's bar isn't in historical yet, use the live quote price
    const series = slots.map(({ label, ymd }) => {
      let close = hist.get(ymd) ?? null;
      // Gap-fill: if this is today and historical hasn't settled, use quote price
      if (close == null && ymd === todayK && quote?.price) {
        close = quote.price;
      }
      return { day: label, ymd, close };
    });

    // Compute % change from Monday's close for each day
    const mondayClose = series.find((s) => s.close != null)?.close ?? null;

    const seriesWithPct = series.map((s) => {
      if (s.close == null || mondayClose == null || mondayClose === 0) {
        return { day: s.day, close: s.close, pct: null };
      }
      const pct = ((s.close - mondayClose) / mondayClose) * 100;
      return { day: s.day, close: s.close, pct: parseFloat(pct.toFixed(3)) };
    });

    // Stats from quote
    const yearHigh   = quote?.yearHigh  ?? null;
    const yearLow    = quote?.yearLow   ?? null;
    const currentPrice = quote?.price ?? null;

    indices[key] = {
      key,
      symbol: meta.symbol,
      name:   meta.name,
      series: seriesWithPct,    // [{day, close, pct}, ...]
      yearHigh,
      yearLow,
      currentPrice,
    };
  }

  return NextResponse.json({
    ok: true,
    indices,
    slots: slots.map((s) => s.label),
    todayKey: todayK,
  });
}
