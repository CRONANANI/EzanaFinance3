import { NextResponse } from 'next/server';
import {
  fetchSingleGlobalQuote,
  fetchAllBulkQuotesAlpha,
  getAlphaVantageApiKey,
} from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';

function normalizeSymbol(sym) {
  return String(sym || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '');
}

function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

async function fetchFmpQuote(symbol) {
  const fmpKey = getFmpKey();
  if (!fmpKey) return null;
  const sym = normalizeSymbol(symbol);
  if (!sym) return null;
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(fmpKey)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const q = Array.isArray(data) ? data[0] : data;
    if (!q?.price && !q?.previousClose) return null;
    const price = Number(q.price || q.previousClose);
    if (!Number.isFinite(price)) return null;
    return {
      symbol: String(q.symbol || sym).toUpperCase(),
      name: q.name || null,
      price,
      change: Number(q.change ?? 0),
      changesPercentage: Number(q.changesPercentage ?? 0),
      previousClose: Number(q.previousClose) || null,
      open: Number(q.open) || null,
      _source: 'fmp',
    };
  } catch {
    return null;
  }
}

export async function GET(request) {
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
}
