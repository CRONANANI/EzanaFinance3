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

async function fetchAvQuote(symbol, AV_KEY) {
  try {
    const url = `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(AV_KEY)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data['Note'] || data['Information'] || data['Error Message']) return null;
    const q = data['Global Quote'];
    if (!q) return null;
    const price = parseFloat(q['05. price']);
    const pctRaw = q['10. change percent'];
    const change = parseFloat(String(pctRaw || '').replace('%', '')) || 0;
    if (!Number.isFinite(price)) return null;
    return { price, change };
  } catch {
    return null;
  }
}

async function fetchAvIndex(symbol, AV_KEY) {
  try {
    const url = `${AV_BASE}?function=INDEX_DATA&symbol=${encodeURIComponent(symbol)}&interval=daily&apikey=${encodeURIComponent(AV_KEY)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data['Note'] || data['Information'] || data['Error Message']) return null;
    const sorted = sortDataRowsByDateDesc(data?.data);
    if (sorted.length < 2) return null;
    const close = parseFloat(sorted[0].close);
    const prevClose = parseFloat(sorted[1].close);
    if (!close || !prevClose) return null;
    const changePct = ((close - prevClose) / prevClose) * 100;
    return { price: close, change: parseFloat(changePct.toFixed(2)) };
  } catch {
    return null;
  }
}

async function fetchAvCommodity(fn, AV_KEY) {
  try {
    const url = `${AV_BASE}?function=${fn}&interval=daily&apikey=${encodeURIComponent(AV_KEY)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data['Note'] || data['Information'] || data['Error Message']) return null;
    const sorted = sortDataRowsByDateDesc(
      (data?.data || []).filter((d) => d.value !== '.' && d.value != null),
    );
    if (sorted.length < 2) return null;
    const latest = parseFloat(sorted[0].value);
    const prev = parseFloat(sorted[1].value);
    if (!latest || !prev) return null;
    const changePct = ((latest - prev) / prev) * 100;
    return { price: latest, change: parseFloat(changePct.toFixed(2)) };
  } catch {
    return null;
  }
}

async function fetchAvMetal(symbol, AV_KEY) {
  try {
    const url = `${AV_BASE}?function=GOLD_SILVER_SPOT&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(AV_KEY)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data['Note'] || data['Information'] || data['Error Message']) return null;
    const price = parseFloat(data?.price);
    const prevClose = parseFloat(data?.previous_close);
    if (!price) return null;
    const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
    return { price, change: parseFloat(changePct.toFixed(2)) };
  } catch {
    return null;
  }
}

async function fetchAvFx(from, to, AV_KEY) {
  try {
    const url = `${AV_BASE}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${encodeURIComponent(AV_KEY)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data['Note'] || data['Information'] || data['Error Message']) return null;
    const rateData = data['Realtime Currency Exchange Rate'];
    if (!rateData) return null;
    const price = parseFloat(rateData['5. Exchange Rate']);
    return price ? { price, change: 0 } : null;
  } catch {
    return null;
  }
}

async function fetchAvCrypto(from, AV_KEY) {
  return fetchAvFx(from, 'USD', AV_KEY);
}

const TICKER_ITEMS = [
  { display: 'S&P 500', type: 'index', symbol: 'SPX' },
  { display: 'NASDAQ', type: 'index', symbol: 'COMP' },
  { display: 'DOW', type: 'index', symbol: 'DJI' },
  { display: 'RUSSELL 2K', type: 'index', symbol: 'RUT' },
  { display: 'VIX', type: 'index', symbol: 'VIX' },
  { display: 'FTSE 100', type: 'quote', symbol: 'EWU' },
  { display: 'DAX', type: 'quote', symbol: 'EWG' },
  { display: 'NIKKEI', type: 'quote', symbol: 'EWJ' },
  { display: 'HANG SENG', type: 'quote', symbol: 'EWH' },
  { display: 'GOLD', type: 'metal', symbol: 'GOLD' },
  { display: 'SILVER', type: 'metal', symbol: 'SILVER' },
  { display: 'OIL WTI', type: 'commodity', fn: 'WTI' },
  { display: 'BRENT', type: 'commodity', fn: 'BRENT' },
  { display: 'NAT GAS', type: 'commodity', fn: 'NATURAL_GAS' },
  { display: 'EUR/USD', type: 'fx', from: 'EUR', to: 'USD' },
  { display: 'USD/JPY', type: 'fx', from: 'USD', to: 'JPY' },
  { display: 'GBP/USD', type: 'fx', from: 'GBP', to: 'USD' },
  { display: 'BTC', type: 'crypto', from: 'BTC' },
  { display: 'ETH', type: 'crypto', from: 'ETH' },
];

async function handleGet() {
  const AV_KEY = getAvKey();

  if (!AV_KEY) {
    return NextResponse.json({ quotes: [], fallback: true });
  }

  const results = await Promise.allSettled(
    TICKER_ITEMS.map(async (item) => {
      let result = null;
      switch (item.type) {
        case 'index':
          result = await fetchAvIndex(item.symbol, AV_KEY);
          break;
        case 'quote':
          result = await fetchAvQuote(item.symbol, AV_KEY);
          break;
        case 'metal':
          result = await fetchAvMetal(item.symbol, AV_KEY);
          break;
        case 'commodity':
          result = await fetchAvCommodity(item.fn, AV_KEY);
          break;
        case 'fx':
          result = await fetchAvFx(item.from, item.to, AV_KEY);
          break;
        case 'crypto':
          result = await fetchAvCrypto(item.from, AV_KEY);
          break;
        default:
          break;
      }
      if (!result) return { symbol: item.display, price: '—', change: 0 };
      return {
        symbol: item.display,
        price: result.price.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        change: result.change,
      };
    }),
  );

  const quotes = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { symbol: '—', price: '—', change: 0 },
  );

  const anyPrice = quotes.some((q) => q.price && q.price !== '—');
  if (!anyPrice) {
    return NextResponse.json(
      { quotes: [], fallback: true },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
    );
  }

  return NextResponse.json(
    { quotes, fallback: false },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
  );
}

export const GET = withApiGuard(handleGet, { requireAuth: false });
