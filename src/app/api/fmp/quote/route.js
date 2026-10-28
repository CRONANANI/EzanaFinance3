import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import {
  fetchSingleGlobalQuote,
  fetchAllBulkQuotesAlpha,
  getAlphaVantageApiKey,
} from '@/lib/alpha-vantage';
import {
  fetchFmpQuote,
  fetchFmpBatchQuotes,
  normalizeQuoteSymbol,
} from '@/lib/trading/server-quote';

export const dynamic = 'force-dynamic';

function fromAv(avQ) {
  return {
    symbol: avQ.symbol,
    price: avQ.price,
    change: avQ.change,
    changesPercentage: avQ.changePercent,
    previousClose: avQ.prevClose,
    open: avQ.open,
    _source: 'alpha_vantage',
  };
}

export const GET = withApiGuard(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const single = normalizeQuoteSymbol(searchParams.get('symbol') || '');
    const manyRaw = (searchParams.get('symbols') || '').trim();

    if (!single && !manyRaw) {
      return NextResponse.json({ error: 'symbol(s) required' }, { status: 400 });
    }

    /* Single symbol: FMP, then Alpha Vantage. */
    if (single && !manyRaw) {
      const fmpResult = await fetchFmpQuote(single);
      if (fmpResult) return NextResponse.json(fmpResult);

      if (getAlphaVantageApiKey()) {
        try {
          const avQuote = await fetchSingleGlobalQuote(single);
          if (avQuote && avQuote.price > 0) return NextResponse.json(fromAv(avQuote));
        } catch (err) {
          console.warn(`[quote] AV fallback failed for ${single}:`, err?.message);
        }
      }
      return NextResponse.json({ symbol: single, error: 'no price available' });
    }

    /* Many symbols: one FMP batch call, AV bulk only for what FMP missed. */
    const symbols = [...new Set(manyRaw.split(',').map(normalizeQuoteSymbol).filter(Boolean))];
    const fmpMap = await fetchFmpBatchQuotes(symbols);

    const missing = symbols.filter((s) => !fmpMap[s]);
    let avQuotes = {};
    if (missing.length && getAlphaVantageApiKey()) {
      try {
        avQuotes = await fetchAllBulkQuotesAlpha(missing);
      } catch (err) {
        console.warn('[quote] AV bulk fallback failed:', err?.message);
      }
    }

    const quotes = [];
    const priceMap = {};
    for (const sym of symbols) {
      const q =
        fmpMap[sym] ||
        (avQuotes[sym]?.price > 0 ? fromAv({ ...avQuotes[sym], symbol: sym }) : null);
      if (!q) continue;
      quotes.push(q);
      priceMap[sym] = {
        price: q.price,
        change: q.change,
        changesPercentage: q.changesPercentage,
      };
    }

    return NextResponse.json({ quotes, priceMap });
  },
  { requireAuth: false },
);
