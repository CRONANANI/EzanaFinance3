import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import {
  fetchAllBulkQuotesAlpha,
  fetchCommodityQuotes,
  isCommoditySymbol,
  getAlphaVantageApiKey,
} from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

async function fetchFinnhubQuote(symbol, apiKey) {
  try {
    const res = await fetch(
      `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { next: { revalidate: 30 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.c === 0) return null;
    return {
      symbol,
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      prevClose: data.pc,
      lastRegularSessionPrice: data.c,
    };
  } catch {
    return null;
  }
}

export const GET = withApiGuard(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const symbolsParam = searchParams.get('symbols') || '';
      const symbols = symbolsParam
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      if (symbols.length === 0) {
        return NextResponse.json({ error: 'No symbols provided' }, { status: 400 });
      }

      const equitySymbols = symbols.filter((s) => !isCommoditySymbol(s));
      const commoditySymbols = symbols.filter((s) => isCommoditySymbol(s));

      const allQuotes = {};

      if (commoditySymbols.length > 0 && getAlphaVantageApiKey()) {
        try {
          const commodityQuotes = await fetchCommodityQuotes(commoditySymbols);
          Object.assign(allQuotes, commodityQuotes);
        } catch (err) {
          console.warn('[batch-quotes] AV commodity quotes failed:', err?.message);
        }
      }

      if (equitySymbols.length > 0 && getAlphaVantageApiKey()) {
        try {
          const equityQuotes = await fetchAllBulkQuotesAlpha(equitySymbols);
          Object.assign(allQuotes, equityQuotes);
        } catch (err) {
          console.warn('[batch-quotes] AV equity quotes failed:', err?.message);
        }
      }

      const missingEquities = equitySymbols.filter((s) => !allQuotes[s]);
      if (missingEquities.length > 0) {
        const apiKey = process.env.FINNHUB_API_KEY;
        if (apiKey) {
          const capped = missingEquities.slice(0, 50);
          const results = await Promise.all(capped.map((s) => fetchFinnhubQuote(s, apiKey)));
          results.forEach((r) => {
            if (r) allQuotes[r.symbol] = r;
          });
        }
      }

      const missingCommodities = commoditySymbols.filter((s) => !allQuotes[s]);
      if (missingCommodities.length > 0) {
        const apiKey = process.env.FINNHUB_API_KEY;
        if (apiKey) {
          const results = await Promise.all(
            missingCommodities.map((s) => fetchFinnhubQuote(s, apiKey)),
          );
          results.forEach((r) => {
            if (r) allQuotes[r.symbol] = r;
          });
        }
      }

      if (Object.keys(allQuotes).length === 0) {
        const apiKey = process.env.FINNHUB_API_KEY;
        if (!getAlphaVantageApiKey() && !apiKey) {
          return NextResponse.json({ error: 'Finnhub API key not configured' }, { status: 500 });
        }
      }

      return NextResponse.json({ quotes: allQuotes });
    } catch (error) {
      console.error('Batch quotes error:', error);
      return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
    }
  },
  { requireAuth: false },
);
