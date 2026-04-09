import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY =
  process.env.FMP_API_KEY ||
  process.env.NEXT_PUBLIC_FMP_API_KEY;
const FMP_BASE = 'https://financialmodelingprep.com/stable';

// Four equity indices — FMP uses caret-prefixed symbols for indices
const INDICES = {
  spx:  { symbol: '^GSPC', name: 'S&P 500' },
  ixic: { symbol: '^IXIC', name: 'NASDAQ' },
  rut:  { symbol: '^RUT',  name: 'Russell 2000' },
  dji:  { symbol: '^DJI',  name: 'Dow Jones' },
};

const INDEX_KEYS = ['spx', 'ixic', 'rut', 'dji'];

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
 * Returns close and open maps for the week window.
 */
async function fetchWeeklyBars(symbol, slots) {
  const fromYmd = slots[0].ymd;
  const toYmd = addDays(fromYmd, 13);
  const url = `${FMP_BASE}/historical-price-eod/full?symbol=${encodeURIComponent(symbol)}&from=${fromYmd}&to=${toYmd}&apikey=${encodeURIComponent(FMP_KEY)}`;
  const closeMap = new Map();
  const openMap = new Map();
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[index-week] historical ${symbol} HTTP ${res.status}`);
      return { closeMap, openMap };
    }
    const data = await res.json();
    const hist = Array.isArray(data)
      ? data
      : Array.isArray(data?.historical)
        ? data.historical
        : [];
    for (const bar of hist) {
      if (!bar.date) continue;
      if (typeof bar.close === 'number') closeMap.set(bar.date, bar.close);
      if (typeof bar.open === 'number') openMap.set(bar.date, bar.open);
    }
  } catch (err) {
    console.error(`[index-week] historical ${symbol}:`, err.message);
  }
  return { closeMap, openMap };
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

  const slots = weekSlots();
  const todayK = todayNy();
  const mondayYmd = slots[0].ymd;

  const [quotes, barResults] = await Promise.all([
    Promise.all(INDEX_KEYS.map((k) => fetchQuote(INDICES[k].symbol))),
    Promise.all(INDEX_KEYS.map((k) => fetchWeeklyBars(INDICES[k].symbol, slots))),
  ]);

  const indices = {};
  const mondayOpens = {};

  for (let i = 0; i < INDEX_KEYS.length; i++) {
    const key = INDEX_KEYS[i];
    const meta = INDICES[key];
    const quote = quotes[i];
    const { closeMap, openMap } = barResults[i];

    const mondayOpen = openMap.get(mondayYmd) ?? null;
    const mondayClose = closeMap.get(mondayYmd) ?? null;
    mondayOpens[key] = mondayOpen != null && Number.isFinite(mondayOpen) ? mondayOpen : null;

    const baseline =
      mondayOpen != null && mondayOpen > 0
        ? mondayOpen
        : mondayClose != null && mondayClose > 0
          ? mondayClose
          : null;

    const series = slots.map(({ label, ymd }) => {
      let close = closeMap.get(ymd) ?? null;
      if (close == null && ymd === todayK && quote?.price) {
        close = quote.price;
      }
      return { day: label, ymd, close };
    });

    const seriesWithPct = series.map((s) => {
      if (s.close == null || baseline == null || baseline <= 0) {
        return { day: s.day, close: s.close, pct: null };
      }
      if (s.ymd === mondayYmd) {
        const dayOpen = openMap.get(mondayYmd);
        if (dayOpen != null && dayOpen > 0) {
          const pct = ((s.close - dayOpen) / dayOpen) * 100;
          return { day: s.day, close: s.close, pct: parseFloat(pct.toFixed(3)) };
        }
        const pct = ((s.close - baseline) / baseline) * 100;
        return { day: s.day, close: s.close, pct: parseFloat(pct.toFixed(3)) };
      }
      const pct = ((s.close - baseline) / baseline) * 100;
      return { day: s.day, close: s.close, pct: parseFloat(pct.toFixed(3)) };
    });

    const currentPrice = quote?.price ?? null;

    indices[key] = {
      key,
      symbol: meta.symbol,
      name: meta.name,
      series: seriesWithPct,
      currentPrice,
    };
  }

  return NextResponse.json({
    ok: true,
    indices,
    slots: slots.map((s) => s.label),
    todayKey: todayK,
    mondayYmd,
    mondayOpens,
  });
}
