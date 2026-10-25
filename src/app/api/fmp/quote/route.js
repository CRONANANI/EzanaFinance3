import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import {
  fetchSingleGlobalQuote,
  fetchAllBulkQuotesAlpha,
  getAlphaVantageApiKey,
} from '@/lib/alpha-vantage';
import { fetchFmpQuote, normalizeQuoteSymbol } from '@/lib/trading/server-quote';

export const dynamic = 'force-dynamic';

const normalizeSymbol = normalizeQuoteSymbol;

export const GET = withApiGuard(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const single = normalizeSymbol(searchParams.get('symbol') || '');
    const manyRaw = (searchParams.get('symbols') || '').trim();

    if (!single && !manyRaw) {
      return NextResponse.json({ error: 'symbol(s) required' }, { status: 400 });
    }

    if (single && !manyRaw) {
      if (getAlphaVantageApiKey()) {
        try {
          const avQuote = await fetchSingleGlobalQuote(single);
          if (avQuote && avQuote.price > 0) {
            return NextResponse.json({
              symbol: avQuote.symbol,
              price: avQuote.price,
              change: avQuote.change,
              changesPercentage: avQuote.changePercent,
              previousClose: avQuote.prevClose,
              open: avQuote.open,
              _source: 'alpha_vantage',
            });
          }
        } catch (err) {
          console.warn(`[quote] AV failed for ${single}:`, err?.message);
        }
      }

      const fmpResult = await fetchFmpQuote(single);
      if (fmpResult) return NextResponse.json(fmpResult);

      return NextResponse.json({ symbol: single, error: 'no price available' });
    }

    const symbols = manyRaw
      .split(',')
      .map((s) => normalizeSymbol(s))
      .filter(Boolean);

    let avQuotes = {};
    if (getAlphaVantageApiKey()) {
      try {
        avQuotes = await fetchAllBulkQuotesAlpha(symbols);
      } catch (err) {
        console.warn('[quote] AV bulk quotes failed:', err?.message);
      }
    }

    const quotes = [];
    const priceMap = {};

    for (const sym of symbols) {
      const avQ = avQuotes[sym];
      if (avQ && avQ.price > 0) {
        quotes.push({
          symbol: sym,
          price: avQ.price,
          change: avQ.change,
          changesPercentage: avQ.changePercent,
          previousClose: avQ.prevClose,
          open: avQ.open,
        });
        priceMap[sym] = {
          price: avQ.price,
          change: avQ.change,
          changesPercentage: avQ.changePercent,
        };
      } else {
        const fmpQ = await fetchFmpQuote(sym);
        if (fmpQ) {
          quotes.push(fmpQ);
          priceMap[sym] = {
            price: fmpQ.price,
            change: fmpQ.change,
            changesPercentage: fmpQ.changesPercentage,
          };
        }
      }
    }

    return NextResponse.json({ quotes, priceMap });
  },
  { requireAuth: false },
);
