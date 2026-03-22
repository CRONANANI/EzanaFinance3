import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const BASE = 'https://finnhub.io/api/v1';

const TICKER_SYMBOLS = [
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
  { symbol: 'OANDA:EUR_USD', display: 'EUR/USD' },
  { symbol: 'OANDA:USD_JPY', display: 'USD/JPY' },
  { symbol: 'OANDA:GBP_USD', display: 'GBP/USD' },
];

const CRYPTO = [
  { symbol: 'BINANCE:BTCUSDT', display: 'BTC' },
  { symbol: 'BINANCE:ETHUSDT', display: 'ETH' },
];

async function handleGet() {
  try {
    const allSymbols = [...TICKER_SYMBOLS, ...FOREX_PAIRS, ...CRYPTO];
    const quotes = await Promise.all(
      allSymbols.map(async (item) => {
        try {
          const res = await fetch(`${BASE}/quote?symbol=${encodeURIComponent(item.symbol)}&token=${FINNHUB_KEY}`);
          const data = await res.json();
          const price = data.c != null ? data.c.toFixed(2) : '—';
          const change = data.dp != null ? parseFloat(data.dp.toFixed(2)) : 0;
          return {
            symbol: item.display,
            price,
            change,
            raw: data,
          };
        } catch {
          return { symbol: item.display, price: '—', change: 0 };
        }
      })
    );

    return NextResponse.json(
      { quotes },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message, quotes: [] }, { status: 500 });
  }
}

export const GET = withApiGuard(handleGet, { requireAuth: false });
