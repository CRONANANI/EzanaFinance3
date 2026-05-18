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

function buildSeries(points, period) {
  if (!points.length) return { series: [], currentPrice: null };

  const startDate = getStartDate(period);
  const filtered = points.filter((p) => p.date >= startDate);

  if (filtered.length === 0) return { series: [], currentPrice: null };

  const baseline = filtered[0].close;

  let sampled = filtered;
  if (period === '1Y' && sampled.length > 52) {
    sampled = sampled.filter((_, i) => i === 0 || i === sampled.length - 1 || i % 5 === 0);
  } else if (period === 'ALL' && sampled.length > 120) {
    sampled = sampled.filter((_, i) => i === 0 || i === sampled.length - 1 || i % 20 === 0);
  } else if ((period === '3M' || period === '6M') && sampled.length > 60) {
    sampled = sampled.filter((_, i) => i === 0 || i === sampled.length - 1 || i % 3 === 0);
  }

  const series = sampled.map((p) => {
    const pct = ((p.close - baseline) / baseline) * 100;
    const d = new Date(`${p.date}T12:00:00Z`);
    let dayLabel;
    if (period === '1D' || period === '7D') {
      dayLabel = d.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' });
    } else if (period === '1M' || period === '3M') {
      dayLabel = d.toLocaleDateString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
      });
    } else {
      dayLabel = d.toLocaleDateString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        year: '2-digit',
      });
    }
    return {
      day: dayLabel,
      ymd: p.date,
      close: p.close,
      pct: parseFloat(pct.toFixed(3)),
    };
  });

  const currentPrice = filtered[filtered.length - 1].close;
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
