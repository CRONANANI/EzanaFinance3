import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { fetchAV, getAlphaVantageApiKey } from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FMP_BASE = 'https://financialmodelingprep.com/stable';

function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

function periodToDays(period) {
  const map = {
    '1D': 1,
    '1W': 7,
    '7D': 7,
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    '3Y': 1095,
    '5Y': 1825,
    '10Y': 3650,
    ALL: 7300,
  };
  return map[period] || 7;
}

function toYmd(date) {
  return date.toISOString().split('T')[0];
}

function getStartDate(period) {
  const d = new Date();
  d.setDate(d.getDate() - periodToDays(period));
  return toYmd(d);
}

const INDEX_CONFIGS = {
  spx: { avFunction: 'INDEX_DATA', avSymbol: 'SPX', fmpSymbol: 'SPY', name: 'S&P 500' },
  ixic: { avFunction: 'INDEX_DATA', avSymbol: 'COMP', fmpSymbol: 'QQQ', name: 'NASDAQ' },
  rut: { avFunction: 'INDEX_DATA', avSymbol: 'RUT', fmpSymbol: 'IWM', name: 'Russell 2000' },
  dji: { avFunction: 'INDEX_DATA', avSymbol: 'DJI', fmpSymbol: 'DIA', name: 'Dow Jones' },
  vix: { avFunction: 'INDEX_DATA', avSymbol: 'VIX', fmpSymbol: '^VIX', name: 'VIX' },
  wti: { avFunction: 'WTI', avSymbol: null, fmpSymbol: 'CLUSD', name: 'WTI Crude' },
  brent: { avFunction: 'BRENT', avSymbol: null, fmpSymbol: 'BZUSD', name: 'Brent Crude' },
  tnx: { avFunction: 'TREASURY_YIELD', avSymbol: null, fmpSymbol: '^TNX', name: '10Y Treasury' },
};

const INDEX_KEYS = Object.keys(INDEX_CONFIGS);

async function fetchAvSeries(config) {
  try {
    let params;
    if (config.avFunction === 'INDEX_DATA') {
      params = { function: 'INDEX_DATA', symbol: config.avSymbol, interval: 'daily' };
    } else if (config.avFunction === 'WTI' || config.avFunction === 'BRENT') {
      params = { function: config.avFunction, interval: 'daily' };
    } else if (config.avFunction === 'TREASURY_YIELD') {
      params = { function: 'TREASURY_YIELD', interval: 'daily', maturity: '10year' };
    } else {
      return null;
    }
    return await fetchAV(params, 300);
  } catch (err) {
    console.warn(`[index-history] AV fetch failed for ${config.name}:`, err?.message);
    return null;
  }
}

async function fetchFmpDaily(fmpSymbol, startDate) {
  const fmpKey = getFmpKey();
  if (!fmpKey || !fmpSymbol) return null;

  const toDate = toYmd(new Date());
  const url = `${FMP_BASE}/historical-price-eod/full?symbol=${encodeURIComponent(fmpSymbol)}&from=${startDate}&to=${toDate}&apikey=${encodeURIComponent(fmpKey)}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const hist = Array.isArray(data)
      ? data
      : Array.isArray(data?.historical)
        ? data.historical
        : [];
    const rows = hist
      .filter((bar) => bar.date != null)
      .map((bar) => {
        const close =
          typeof bar.close === 'number' ? bar.close : parseFloat(String(bar.close ?? ''));
        return { date: bar.date, close };
      })
      .filter((row) => Number.isFinite(row.close));

    return rows.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return null;
  }
}

function parseAvResponse(data, config) {
  const points = [];

  if (config.avFunction === 'INDEX_DATA') {
    if (Array.isArray(data?.data)) {
      for (const item of data.data) {
        const close = parseFloat(item.close);
        if (item.date && Number.isFinite(close)) points.push({ date: item.date, close });
      }
    }
    const ts = data['Time Series (Daily)'];
    if (!points.length && ts && typeof ts === 'object') {
      for (const [date, o] of Object.entries(ts)) {
        const raw = o['4. close'] ?? o['5. adjusted close'];
        const close = parseFloat(raw);
        if (Number.isFinite(close)) points.push({ date, close });
      }
    }
  } else if (Array.isArray(data?.data)) {
    for (const item of data.data) {
      const close = parseFloat(item.value);
      if (item.date && Number.isFinite(close) && item.value !== '.') {
        points.push({ date: item.date, close });
      }
    }
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}

function aggregateByWeek(points, maxWeeks = 4) {
  if (!points.length) return [];
  const weeks = new Map();
  for (const p of points) {
    const d = new Date(`${p.date}T12:00:00Z`);
    const wd = d.getUTCDay();
    const mondayOffset = wd === 0 ? -6 : 1 - wd;
    d.setUTCDate(d.getUTCDate() + mondayOffset);
    const key = d.toISOString().slice(0, 10);
    weeks.set(key, p);
  }
  const sorted = [...weeks.values()].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.slice(-maxWeeks).map((p, i) => ({
    day: `Week ${i + 1}`,
    ymd: p.date,
    close: p.close,
  }));
}

function aggregateByMonth(points) {
  if (!points.length) return [];
  const months = new Map();
  for (const p of points) months.set(p.date.slice(0, 7), p);
  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, p]) => {
      const d = new Date(`${p.date}T12:00:00Z`);
      return {
        day: d.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short' }),
        ymd: p.date,
        close: p.close,
      };
    });
}

function aggregateByYear(points) {
  if (!points.length) return [];
  const years = new Map();
  for (const p of points) years.set(p.date.slice(0, 4), p);
  return [...years.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearKey, p]) => ({ day: yearKey, ymd: p.date, close: p.close }));
}

function applyPctSeries(aggregated) {
  if (!aggregated.length) return [];
  const base = aggregated[0].close;
  if (!Number.isFinite(base) || base === 0) return aggregated.map((p) => ({ ...p, pct: 0 }));
  return aggregated.map((p) => ({
    ...p,
    pct: parseFloat((((p.close - base) / base) * 100).toFixed(3)),
  }));
}

function buildSeries(points, period) {
  if (!points.length) return { series: [], currentPrice: null };

  const startDate = getStartDate(period);
  const filtered = points.filter((p) => p.date >= startDate);
  if (!filtered.length) return { series: [], currentPrice: null };

  const currentPrice = filtered[filtered.length - 1].close;
  let aggregated;

  if (period === '1D') {
    const last = filtered[filtered.length - 1];
    const d = new Date(`${last.date}T12:00:00Z`);
    aggregated = [
      {
        day: d.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' }),
        ymd: last.date,
        close: last.close,
      },
    ];
  } else if (period === '7D' || period === '1W') {
    aggregated = filtered.slice(-5).map((p) => {
      const d = new Date(`${p.date}T12:00:00Z`);
      return {
        day: d.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' }),
        ymd: p.date,
        close: p.close,
      };
    });
  } else if (period === '1M') {
    aggregated = aggregateByWeek(filtered, 4);
  } else if (period === '3M' || period === '6M' || period === '1Y') {
    const n = period === '3M' ? 3 : period === '6M' ? 6 : 12;
    aggregated = aggregateByMonth(filtered).slice(-n);
  } else if (period === '3Y' || period === '5Y' || period === '10Y') {
    aggregated = aggregateByMonth(filtered);
  } else if (period === 'ALL') {
    aggregated = aggregateByYear(filtered);
  } else {
    aggregated = filtered.map((p) => ({ day: p.date, ymd: p.date, close: p.close }));
  }

  return { series: applyPctSeries(aggregated), currentPrice };
}

async function fallbackIndexWeek(request) {
  const origin = request.nextUrl.origin;
  const res = await fetch(`${origin}/api/market/index-week`, { cache: 'no-store' });
  const data = await res.json();
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  });
}

export const GET = withApiGuard(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7D';
    const avKey = getAlphaVantageApiKey();
    const fmpKey = getFmpKey();

    if (!avKey && !fmpKey) {
      if (period === '7D') {
        try {
          return await fallbackIndexWeek(request);
        } catch {
          /* fall through */
        }
      }
      return NextResponse.json(
        { ok: false, error: 'no_key', indices: {}, period },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const startDate = getStartDate(period);
    const indices = {};
    let anySuccess = false;

    const results = await Promise.allSettled(
      INDEX_KEYS.map(async (key) => {
        const config = INDEX_CONFIGS[key];

        if (avKey) {
          const avData = await fetchAvSeries(config);
          if (avData) {
            const points = parseAvResponse(avData, config);
            if (points.length > 0) {
              return { key, points, source: 'av' };
            }
          }
        }

        if (fmpKey && config.fmpSymbol) {
          const fmpPoints = await fetchFmpDaily(config.fmpSymbol, startDate);
          if (fmpPoints && fmpPoints.length > 0) {
            return { key, points: fmpPoints, source: 'fmp' };
          }
        }

        return { key, points: [], source: 'none' };
      }),
    );

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      const { key, points } = result.value;
      const config = INDEX_CONFIGS[key];
      const { series, currentPrice } = buildSeries(points, period);

      if (series.length > 0) anySuccess = true;

      indices[key] = { key, name: config.name, series, currentPrice };
    }

    for (const key of INDEX_KEYS) {
      if (!indices[key]) {
        indices[key] = { key, name: INDEX_CONFIGS[key].name, series: [], currentPrice: null };
      }
    }

    if (!anySuccess && period === '7D') {
      try {
        return await fallbackIndexWeek(request);
      } catch {
        /* fall through */
      }
    }

    const cacheTtl = period === '1D' ? 60 : period === '7D' ? 120 : 300;

    return NextResponse.json(
      { ok: anySuccess, indices, period },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${cacheTtl}, stale-while-revalidate=${cacheTtl * 2}`,
        },
      },
    );
  },
  { requireAuth: false },
);
