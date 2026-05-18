import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

const AV_BASE = 'https://www.alphavantage.co/query';

function getAvKey() {
  return process.env.ALPHA_VANTAGE_API_KEY || process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || '';
}

function sortDataRowsByDateDesc(rows) {
  if (!Array.isArray(rows)) return [];
  return [...rows].filter((r) => r?.date).sort((a, b) => b.date.localeCompare(a.date));
}

async function avFetch(params) {
  const AV_KEY = getAvKey();
  const url = new URL(AV_BASE);
  url.searchParams.set('apikey', AV_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') url.searchParams.set(k, v);
  }
  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data['Note'] || data['Information'] || data['Error Message']) return null;
    return data;
  } catch {
    return null;
  }
}

function parseIndexDaily(data) {
  const sorted = sortDataRowsByDateDesc(data?.data);
  if (sorted.length < 2) return null;
  const close = parseFloat(sorted[0].close);
  const prevClose = parseFloat(sorted[1].close);
  if (!close || !prevClose) return null;
  const pct = ((close - prevClose) / prevClose) * 100;
  return {
    value: close.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    change: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
    changeVal: parseFloat(pct.toFixed(2)),
  };
}

function parseCommodityDaily(data) {
  const sorted = sortDataRowsByDateDesc(
    (data?.data || []).filter((d) => d.value !== '.' && d.value != null),
  );
  if (sorted.length < 2) return null;
  const latest = parseFloat(sorted[0].value);
  const prev = parseFloat(sorted[1].value);
  if (!latest || !prev) return null;
  const pct = ((latest - prev) / prev) * 100;
  return {
    value: `$${latest.toFixed(2)}`,
    change: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
    changeVal: parseFloat(pct.toFixed(2)),
  };
}

function parseFxRate(data) {
  const rateData = data?.['Realtime Currency Exchange Rate'];
  if (!rateData) return null;
  const rate = parseFloat(rateData['5. Exchange Rate']);
  return rate ? { value: rate.toFixed(4), change: '—', changeVal: 0 } : null;
}

async function handleGet(request) {
  const { searchParams } = new URL(request.url);
  const layer = searchParams.get('layer') || 'markets';
  const AV_KEY = getAvKey();

  if (!AV_KEY) {
    return NextResponse.json({ ok: false, reason: 'no_key', data: null });
  }

  let result = {};

  if (layer === 'indices' || layer === 'markets') {
    const indices = [
      { key: 'SPX', name: 'S&P 500' },
      { key: 'COMP', name: 'NASDAQ Composite' },
      { key: 'DJI', name: 'Dow Jones' },
      { key: 'RUT', name: 'Russell 2000' },
      { key: 'VIX', name: 'VIX' },
      { key: 'NDX', name: 'NASDAQ 100' },
    ];
    const responses = await Promise.allSettled(
      indices.map((idx) => avFetch({ function: 'INDEX_DATA', symbol: idx.key, interval: 'daily' })),
    );
    const items = indices.map((idx, i) => {
      const raw = responses[i].status === 'fulfilled' ? responses[i].value : null;
      const parsed = raw ? parseIndexDaily(raw) : null;
      return {
        name: idx.name,
        symbol: idx.key,
        value: parsed?.value || '—',
        change: parsed?.change || '—',
        changeVal: parsed?.changeVal || 0,
        status: 'LIVE',
      };
    });
    result = { items };
  }

  if (layer === 'commodities') {
    const commodities = [
      { fn: 'WTI', name: 'Crude Oil (WTI)' },
      { fn: 'BRENT', name: 'Brent Crude' },
      { fn: 'NATURAL_GAS', name: 'Natural Gas' },
      { fn: 'COPPER', name: 'Copper' },
      { fn: 'ALUMINUM', name: 'Aluminum' },
      { fn: 'WHEAT', name: 'Wheat' },
      { fn: 'CORN', name: 'Corn' },
      { fn: 'COFFEE', name: 'Coffee' },
      { fn: 'SUGAR', name: 'Sugar' },
      { fn: 'COTTON', name: 'Cotton' },
    ];
    const metals = [
      { symbol: 'GOLD', name: 'Gold' },
      { symbol: 'SILVER', name: 'Silver' },
    ];

    const [commResults, metalResults] = await Promise.all([
      Promise.allSettled(commodities.map((c) => avFetch({ function: c.fn, interval: 'daily' }))),
      Promise.allSettled(
        metals.map((m) => avFetch({ function: 'GOLD_SILVER_SPOT', symbol: m.symbol })),
      ),
    ]);

    const energy = [];
    const metalsArr = [];
    const agriculture = [];

    commodities.forEach((c, i) => {
      const raw = commResults[i].status === 'fulfilled' ? commResults[i].value : null;
      const parsed = raw ? parseCommodityDaily(raw) : null;
      const item = {
        name: c.name,
        symbol: c.fn,
        value: parsed?.value || '—',
        change: parsed?.change || '—',
        changeVal: parsed?.changeVal || 0,
      };
      if (['WTI', 'BRENT', 'NATURAL_GAS'].includes(c.fn)) energy.push(item);
      else if (['COPPER', 'ALUMINUM'].includes(c.fn)) metalsArr.push(item);
      else agriculture.push(item);
    });

    metals.forEach((m, i) => {
      const raw = metalResults[i].status === 'fulfilled' ? metalResults[i].value : null;
      const price = raw ? parseFloat(raw?.price) : null;
      metalsArr.unshift({
        name: m.name,
        symbol: m.symbol,
        value: price ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—',
        change: '—',
        changeVal: 0,
      });
    });

    result = { energy, metals: metalsArr, agriculture };
  }

  if (layer === 'currencies') {
    const pairs = [
      { from: 'EUR', to: 'USD', country: 'Eurozone', code: 'EUR', emoji: '🇪🇺' },
      { from: 'GBP', to: 'USD', country: 'UK', code: 'GBP', emoji: '🇬🇧' },
      { from: 'USD', to: 'JPY', country: 'Japan', code: 'JPY', emoji: '🇯🇵' },
      { from: 'USD', to: 'CHF', country: 'Switzerland', code: 'CHF', emoji: '🇨🇭' },
      { from: 'USD', to: 'CAD', country: 'Canada', code: 'CAD', emoji: '🇨🇦' },
      { from: 'AUD', to: 'USD', country: 'Australia', code: 'AUD', emoji: '🇦🇺' },
      { from: 'USD', to: 'CNY', country: 'China', code: 'CNY', emoji: '🇨🇳' },
    ];
    const responses = await Promise.allSettled(
      pairs.map((p) =>
        avFetch({
          function: 'CURRENCY_EXCHANGE_RATE',
          from_currency: p.from,
          to_currency: p.to,
        }),
      ),
    );
    const items = pairs.map((p, i) => {
      const raw = responses[i].status === 'fulfilled' ? responses[i].value : null;
      const parsed = raw ? parseFxRate(raw) : null;
      return {
        country: p.country,
        code: p.code,
        emoji: p.emoji,
        value: parsed?.value || '—',
        change: parsed?.change || '—',
        changeVal: parsed?.changeVal || 0,
      };
    });
    result = { items };
  }

  return NextResponse.json(
    { ok: true, layer, data: result },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } },
  );
}

export const GET = withApiGuard(handleGet, { requireAuth: false });
