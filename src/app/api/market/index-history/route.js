import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AV_BASE = 'https://www.alphavantage.co/query';

function getAvKey() {
  return process.env.ALPHA_VANTAGE_API_KEY || process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || '';
}

/**
 * Map period string to number of calendar days to look back.
 */
function periodToDays(period) {
  const map = {
    '1D': 1,
    '7D': 7,
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    ALL: 7300,
  };
  return map[period] || 7;
}

function toYmd(date) {
  return date.toISOString().split('T')[0];
}

function getStartDate(period) {
  const days = periodToDays(period);
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toYmd(d);
}

const INDEX_CONFIGS = {
  spx: { avFunction: 'INDEX_DATA', avSymbol: 'SPX', name: 'S&P 500' },
  ixic: { avFunction: 'INDEX_DATA', avSymbol: 'COMP', name: 'NASDAQ' },
  rut: { avFunction: 'INDEX_DATA', avSymbol: 'RUT', name: 'Russell 2000' },
  dji: { avFunction: 'INDEX_DATA', avSymbol: 'DJI', name: 'Dow Jones' },
  vix: { avFunction: 'INDEX_DATA', avSymbol: 'VIX', name: 'VIX' },
  wti: { avFunction: 'WTI', avSymbol: null, name: 'WTI Crude' },
  brent: { avFunction: 'BRENT', avSymbol: null, name: 'Brent Crude' },
  tnx: { avFunction: 'TREASURY_YIELD', avSymbol: null, name: '10Y Treasury' },
};

const INDEX_KEYS = Object.keys(INDEX_CONFIGS);

async function fetchAvSeries(key, config) {
  const AV_KEY = getAvKey();
  if (!AV_KEY) return null;

  let url;
  if (config.avFunction === 'INDEX_DATA') {
    url = `${AV_BASE}?function=INDEX_DATA&symbol=${encodeURIComponent(config.avSymbol)}&interval=daily&apikey=${encodeURIComponent(AV_KEY)}`;
  } else if (config.avFunction === 'WTI' || config.avFunction === 'BRENT') {
    url = `${AV_BASE}?function=${config.avFunction}&interval=daily&apikey=${encodeURIComponent(AV_KEY)}`;
  } else if (config.avFunction === 'TREASURY_YIELD') {
    url = `${AV_BASE}?function=TREASURY_YIELD&interval=daily&maturity=10year&apikey=${encodeURIComponent(AV_KEY)}`;
  } else {
    return null;
  }

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.Note || data.Information || data['Error Message']) return null;
    return data;
  } catch {
    return null;
  }
}

function parseAvResponse(data, config) {
  const points = [];

  if (config.avFunction === 'INDEX_DATA') {
    const arr = data?.data;
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const close = parseFloat(item.close);
        if (item.date && Number.isFinite(close)) {
          points.push({ date: item.date, close });
        }
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
  } else if (
    config.avFunction === 'WTI' ||
    config.avFunction === 'BRENT' ||
    config.avFunction === 'TREASURY_YIELD'
  ) {
    const arr = data?.data;
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const close = parseFloat(item.value);
        if (item.date && Number.isFinite(close) && item.value !== '.') {
          points.push({ date: item.date, close });
        }
      }
    }
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}

/**
 * UTC Monday start for the calendar week containing `ymd` (YYYY-MM-DD).
 */
function weekStartMondayUtc(ymd) {
  const d = new Date(`${ymd}T12:00:00Z`);
  const wd = d.getUTCDay();
  const mondayOffset = wd === 0 ? -6 : 1 - wd;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  return d.toISOString().slice(0, 10);
}

/**
 * Group points into weeks (Monday week start); last point per week wins.
 * Labels "Week 1".."Week N" chronologically within `sliced`.
 */
function aggregateByWeek(points, maxWeeks = 4) {
  if (!points.length) return [];

  const weeks = new Map();
  for (const p of points) {
    weeks.set(weekStartMondayUtc(p.date), p);
  }

  const weekEntries = [...weeks.values()].sort((a, b) => a.date.localeCompare(b.date));
  const sliced = weekEntries.slice(-maxWeeks);

  return sliced.map((p, i) => ({
    day: `Week ${i + 1}`,
    ymd: p.date,
    close: p.close,
  }));
}

/**
 * Last trading day per calendar month; label = short month in America/New_York.
 */
function aggregateByMonth(points) {
  if (!points.length) return [];

  const months = new Map();
  for (const p of points) {
    const monthKey = p.date.slice(0, 7);
    months.set(monthKey, p);
  }

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

/** Last trading day per calendar year; label = full year. */
function aggregateByYear(points) {
  if (!points.length) return [];

  const years = new Map();
  for (const p of points) {
    const yearKey = p.date.slice(0, 4);
    years.set(yearKey, p);
  }

  return [...years.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearKey, p]) => ({
      day: yearKey,
      ymd: p.date,
      close: p.close,
    }));
}

/** % change from first displayed point (chart baseline = 0%). */
function applyPctSeries(aggregated) {
  if (!aggregated.length) return [];
  const baselineClose = aggregated[0].close;
  if (!Number.isFinite(baselineClose) || baselineClose === 0) {
    return aggregated.map((p) => ({ ...p, pct: 0 }));
  }
  return aggregated.map((p) => ({
    ...p,
    pct: parseFloat((((p.close - baselineClose) / baselineClose) * 100).toFixed(3)),
  }));
}

/**
 * Aggregate daily points for the selected period.
 *
 * 7D  → last 5 sessions, weekday labels
 * 1M  → 4 weeks, "Week 1"…
 * 3M/6M/1Y → last 3 / 6 / 12 month-end closes, month labels
 * ALL → yearly
 * 1D  → latest session only
 */
function buildSeries(points, period) {
  if (!points.length) return { series: [], currentPrice: null };

  const startDate = getStartDate(period);
  const filtered = points.filter((p) => p.date >= startDate);

  if (filtered.length === 0) return { series: [], currentPrice: null };

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
  } else if (period === '7D') {
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
  } else if (period === 'ALL') {
    aggregated = aggregateByYear(filtered);
  } else {
    aggregated = filtered.map((p) => ({
      day: p.date,
      ymd: p.date,
      close: p.close,
    }));
  }

  const series = applyPctSeries(aggregated);
  return { series, currentPrice };
}

async function fallbackIndexWeek(request) {
  const origin = request.nextUrl.origin;
  const fallbackRes = await fetch(`${origin}/api/market/index-week`, { cache: 'no-store' });
  const fallbackData = await fallbackRes.json();
  return NextResponse.json(fallbackData, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '7D';

  const AV_KEY = getAvKey();

  if (!AV_KEY) {
    if (period === '7D') {
      try {
        return await fallbackIndexWeek(request);
      } catch {
        return NextResponse.json(
          { ok: false, error: 'no_key', indices: {}, period },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      }
    }
    return NextResponse.json(
      { ok: false, error: 'no_key', indices: {}, period },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const avResults = await Promise.all(
    INDEX_KEYS.map((key) => fetchAvSeries(key, INDEX_CONFIGS[key])),
  );

  const indices = {};
  let anySuccess = false;

  for (let i = 0; i < INDEX_KEYS.length; i++) {
    const key = INDEX_KEYS[i];
    const config = INDEX_CONFIGS[key];
    const rawData = avResults[i];

    if (!rawData) {
      indices[key] = { key, name: config.name, series: [], currentPrice: null };
      continue;
    }

    const points = parseAvResponse(rawData, config);
    const { series, currentPrice } = buildSeries(points, period);

    if (series.length > 0) anySuccess = true;

    indices[key] = {
      key,
      name: config.name,
      series,
      currentPrice,
    };
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
}
