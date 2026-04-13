import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const BASE = 'https://financialmodelingprep.com/api/v3';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const single = (searchParams.get('symbol') || '').toUpperCase().trim();
  const many = (searchParams.get('symbols') || '').toUpperCase().trim();
  const list = many || single;

  if (!list) {
    return NextResponse.json({ error: 'symbol(s) required' }, { status: 400 });
  }
  if (!FMP_KEY) {
    console.error('[fmp/quote] FMP_API_KEY missing — check env vars on Vercel');
    return NextResponse.json(
      { error: 'FMP_API_KEY not configured', quotes: [], priceMap: {} },
      { status: 503 }
    );
  }

  const url = `${BASE}/quote/${encodeURIComponent(list)}?apikey=${encodeURIComponent(FMP_KEY)}`;
  const urlForLog = `${BASE}/quote/${encodeURIComponent(list)}?apikey=***`;

  try {
    console.log('[fmp/quote] upstream:', urlForLog);
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      let bodyText = '';
      try {
        bodyText = await res.text();
      } catch {
        bodyText = '(unreadable)';
      }
      console.error(
        `[fmp/quote] upstream FMP returned HTTP ${res.status}:`,
        bodyText.slice(0, 500)
      );
      return NextResponse.json(
        {
          error: `FMP HTTP ${res.status}`,
          detail: bodyText.slice(0, 200),
          quotes: [],
          priceMap: {},
        },
        { status: 200 }
      );
    }

    const data = await res.json();
    const quotes = Array.isArray(data) ? data : [data].filter(Boolean);

    console.log(`[fmp/quote] received ${quotes.length} quotes for: ${list}`);

    if (single && !many) {
      return NextResponse.json(quotes[0] ?? {});
    }

    const priceMap = {};
    const warnings = [];
    for (const q of quotes) {
      if (!q?.symbol) {
        warnings.push(`row missing symbol: ${JSON.stringify(q).slice(0, 100)}`);
        continue;
      }
      const sym = q.symbol.toUpperCase();
      let chosen = null;
      let source = null;

      if (typeof q.price === 'number' && q.price > 0) {
        chosen = q.price;
        source = 'price';
      } else if (typeof q.previousClose === 'number' && q.previousClose > 0) {
        chosen = q.previousClose;
        source = 'previousClose';
        warnings.push(`${sym}: using previousClose (price=${q.price})`);
      } else if (typeof q.open === 'number' && q.open > 0) {
        chosen = q.open;
        source = 'open';
        warnings.push(`${sym}: using open (price=${q.price}, previousClose=${q.previousClose})`);
      }

      if (chosen === null) {
        warnings.push(`${sym}: no usable price field`);
        continue;
      }

      priceMap[sym] = {
        price: chosen,
        change: typeof q.change === 'number' ? q.change : 0,
        changesPercentage: typeof q.changesPercentage === 'number' ? q.changesPercentage : 0,
        _source: source,
      };
    }

    if (warnings.length > 0) {
      console.warn('[fmp/quote] warnings:', warnings);
    }

    console.log(
      `[fmp/quote] priceMap has ${Object.keys(priceMap).length}/${quotes.length} entries`
    );

    return NextResponse.json({ quotes, priceMap, warnings });
  } catch (err) {
    console.error('[fmp/quote] caught exception:', err?.message, err);
    return NextResponse.json(
      {
        error: err?.message || 'unknown error',
        quotes: [],
        priceMap: {},
      },
      { status: 200 }
    );
  }
}
