import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { fetchAllBulkQuotesAlpha, getAlphaVantageApiKey, fetchAV } from '@/lib/alpha-vantage';
import { cacheGetOrSet } from '@/lib/cache';

export const dynamic = 'force-dynamic';

// Same payload for everyone; refresh at most once per minute. Caching here also
// protects the upstream AlphaVantage/Finnhub quotas from request bursts.
const QUOTES_TTL_SECONDS = 60;

async function fetchFinnhubQuote(symbol, apiKey) {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { next: { revalidate: 30 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.c === 0) return null;
    return {
      symbol,
      price: data.c?.toFixed(2) ?? '—',
      change: data.dp != null ? parseFloat(data.dp.toFixed(2)) : 0,
    };
  } catch {
    return null;
  }
}

async function fetchAvFxRate(from, to) {
  try {
    const data = await fetchAV(
      { function: 'CURRENCY_EXCHANGE_RATE', from_currency: from, to_currency: to },
      60,
    );
    const rate = parseFloat(data?.['Realtime Currency Exchange Rate']?.['5. Exchange Rate']);
    return Number.isFinite(rate) ? rate : null;
  } catch {
    return null;
  }
}

async function fetchAvCryptoRate(from) {
  try {
    const data = await fetchAV(
      { function: 'CURRENCY_EXCHANGE_RATE', from_currency: from, to_currency: 'USD' },
      60,
    );
    const rate = parseFloat(data?.['Realtime Currency Exchange Rate']?.['5. Exchange Rate']);
    return Number.isFinite(rate) ? rate : null;
  } catch {
    return null;
  }
}

const EQUITY_SYMBOLS = [
  { symbol: 'SPY', display: 'S&P 500' },
  { symbol: 'QQQ', display: 'NASDAQ' },
  { symbol: 'DIA', display: 'DOW' },
  { symbol: 'EWU', display: 'FTSE 100' },
  { symbol: 'EWG', display: 'DAX' },
  { symbol: 'EWJ', display: 'NIKKEI' },
  { symbol: 'EWH', display: 'HANG SENG' },
  { symbol: 'FXI', display: 'CHINA' },
  { symbol: 'INDA', display: 'INDIA' },
  { symbol: 'EWA', display: 'ASX' },
  { symbol: 'EWC', display: 'TSX' },
  { symbol: 'EWZ', display: 'BRAZIL' },
  { symbol: 'EWY', display: 'KOSPI' },
  { symbol: 'GLD', display: 'GOLD' },
  { symbol: 'SLV', display: 'SILVER' },
  { symbol: 'USO', display: 'OIL WTI' },
  { symbol: 'UNG', display: 'NAT GAS' },
  { symbol: 'COPX', display: 'COPPER' },
];

const FOREX_PAIRS = [
  { from: 'EUR', to: 'USD', display: 'EUR/USD' },
  { from: 'USD', to: 'JPY', display: 'USD/JPY' },
  { from: 'GBP', to: 'USD', display: 'GBP/USD' },
];

const CRYPTO_SYMBOLS = [
  { from: 'BTC', display: 'BTC' },
  { from: 'ETH', display: 'ETH' },
];

async function handleGet() {
  const avKey = getAlphaVantageApiKey();
  const finnhubKey = process.env.FINNHUB_API_KEY;
  const allQuotes = [];

  const equitySymbols = EQUITY_SYMBOLS.map((e) => e.symbol);

  if (avKey) {
    try {
      const avQuotes = await fetchAllBulkQuotesAlpha(equitySymbols);
      for (const item of EQUITY_SYMBOLS) {
        const q = avQuotes[item.symbol];
        if (q && q.price > 0) {
          allQuotes.push({
            symbol: item.display,
            price: q.price.toFixed(2),
            change: parseFloat((q.changePercent ?? 0).toFixed(2)),
          });
        } else {
          allQuotes.push({ symbol: item.display, price: '—', change: 0 });
        }
      }
    } catch {
      if (finnhubKey) {
        const results = await Promise.all(
          EQUITY_SYMBOLS.map((item) => fetchFinnhubQuote(item.symbol, finnhubKey)),
        );
        for (let i = 0; i < EQUITY_SYMBOLS.length; i++) {
          const r = results[i];
          allQuotes.push(
            r
              ? { symbol: EQUITY_SYMBOLS[i].display, price: r.price, change: r.change }
              : { symbol: EQUITY_SYMBOLS[i].display, price: '—', change: 0 },
          );
        }
      }
    }
  } else if (finnhubKey) {
    const results = await Promise.all(
      EQUITY_SYMBOLS.map((item) => fetchFinnhubQuote(item.symbol, finnhubKey)),
    );
    for (let i = 0; i < EQUITY_SYMBOLS.length; i++) {
      const r = results[i];
      allQuotes.push(
        r
          ? { symbol: EQUITY_SYMBOLS[i].display, price: r.price, change: r.change }
          : { symbol: EQUITY_SYMBOLS[i].display, price: '—', change: 0 },
      );
    }
  }

  for (const pair of FOREX_PAIRS) {
    if (avKey) {
      const rate = await fetchAvFxRate(pair.from, pair.to);
      allQuotes.push({
        symbol: pair.display,
        price: rate ? rate.toFixed(4) : '—',
        change: 0,
      });
    } else if (finnhubKey) {
      const r = await fetchFinnhubQuote(`OANDA:${pair.from}_${pair.to}`, finnhubKey);
      allQuotes.push(
        r
          ? { symbol: pair.display, price: r.price, change: r.change }
          : { symbol: pair.display, price: '—', change: 0 },
      );
    }
  }

  for (const coin of CRYPTO_SYMBOLS) {
    if (avKey) {
      const rate = await fetchAvCryptoRate(coin.from);
      allQuotes.push({
        symbol: coin.display,
        price: rate
          ? rate.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '—',
        change: 0,
      });
    } else if (finnhubKey) {
      const r = await fetchFinnhubQuote(`BINANCE:${coin.from}USDT`, finnhubKey);
      allQuotes.push(
        r
          ? { symbol: coin.display, price: r.price, change: r.change }
          : { symbol: coin.display, price: '—', change: 0 },
      );
    }
  }

  return allQuotes.filter((q) => q.price !== '—');
}

export const GET = withApiGuard(
  async () => {
    try {
      const quotes = await cacheGetOrSet('market-data:quotes', QUOTES_TTL_SECONDS, handleGet);
      return NextResponse.json(
        { quotes },
        { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
      );
    } catch (err) {
      console.error('[market-data/quotes]', err);
      return NextResponse.json({ quotes: [] }, { status: 500 });
    }
  },
  { requireAuth: false },
);
