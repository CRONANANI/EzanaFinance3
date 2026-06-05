import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

/* Read at request time, not module load. See stock-candles for rationale. */
function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

const FMP_BASE = 'https://financialmodelingprep.com/stable';

// Equity indices + volatility, crude, yields — FMP symbols (no DXY: unreliable on FMP)
const INDICES = {
  spx: { symbol: '^GSPC', name: 'S&P 500' },
  ixic: { symbol: '^IXIC', name: 'NASDAQ' },
  rut: { symbol: '^RUT', name: 'Russell 2000' },
  dji: { symbol: '^DJI', name: 'Dow Jones' },
  vix: { symbol: '^VIX', name: 'VIX' },
  wti: { symbol: 'CLUSD', name: 'WTI Crude' },
  brent: { symbol: 'BZUSD', name: 'Brent Crude' },
  tnx: { symbol: '^TNX', name: '10Y Treasury' },
};

const INDEX_KEYS = ['spx', 'ixic', 'rut', 'dji', 'vix', 'wti', 'brent', 'tnx'];

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
  const FMP_KEY = getFmpKey();
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
      item?.price != null
        ? typeof item.price === 'number'
          ? item.price
          : parseFloat(String(item.price))
        : NaN;
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
  const FMP_KEY = getFmpKey();
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

export const GET = withApiGuard(
  async (request, user) => {
    const FMP_KEY = getFmpKey();
    if (!FMP_KEY) {
      const emptySlots = weekSlots();
      return NextResponse.json(
        {
          ok: false,
          error: 'no_key',
          indices: {},
          slots: emptySlots.map((s) => s.label),
        },
        {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        },
      );
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

      /* Fallback baseline from live quote when historical data isn't available yet
       (common on Monday morning before the historical endpoint publishes) */
      const quoteOpen =
        quote?.open != null && Number.isFinite(quote.open) && quote.open > 0 ? quote.open : null;
      const quotePrevClose =
        quote?.previousClose != null &&
        Number.isFinite(quote.previousClose) &&
        quote.previousClose > 0
          ? quote.previousClose
          : null;

      const baseline =
        mondayOpen != null && mondayOpen > 0
          ? mondayOpen
          : mondayClose != null && mondayClose > 0
            ? mondayClose
            : quoteOpen
              ? quoteOpen
              : quotePrevClose
                ? quotePrevClose
                : quote?.price != null && Number.isFinite(quote.price) && quote.price > 0
                  ? quote.price
                  : null;

      mondayOpens[key] = baseline;

      const series = slots.map(({ label, ymd }) => {
        let close = closeMap.get(ymd) ?? null;
        if (close == null && ymd === todayK && quote?.price) {
          close = quote.price;
        }
        return { day: label, ymd, close };
      });

      const seriesWithPct = series.map((s) => {
        if (s.close == null || baseline == null || baseline <= 0) {
          return { day: s.day, ymd: s.ymd, close: s.close, pct: null };
        }
        if (s.ymd === mondayYmd) {
          const dayOpen = openMap.get(mondayYmd);
          if (dayOpen != null && dayOpen > 0) {
            const pct = ((s.close - dayOpen) / dayOpen) * 100;
            return { day: s.day, ymd: s.ymd, close: s.close, pct: parseFloat(pct.toFixed(3)) };
          }
          const pct = ((s.close - baseline) / baseline) * 100;
          return { day: s.day, ymd: s.ymd, close: s.close, pct: parseFloat(pct.toFixed(3)) };
        }
        const pct = ((s.close - baseline) / baseline) * 100;
        return { day: s.day, ymd: s.ymd, close: s.close, pct: parseFloat(pct.toFixed(3)) };
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
  },
  { requireAuth: false },
);
