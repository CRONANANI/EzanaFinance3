import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const BASE = 'https://financialmodelingprep.com/api/v3';

/** FMP often returns numeric fields as strings; coerce so priceMap is consistent for every ticker. */
function parseFmpNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickTradePrice(q) {
  const price = parseFmpNumber(q?.price);
  if (price !== null && price > 0) return { value: price, source: 'price' };
  const prevClose = parseFmpNumber(q?.previousClose);
  if (prevClose !== null && prevClose > 0) return { value: prevClose, source: 'previousClose' };
  const open = parseFmpNumber(q?.open);
  if (open !== null && open > 0) return { value: open, source: 'open' };
  return null;
}

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
      const q = quotes[0];
      if (!q) return NextResponse.json({});
      const picked = pickTradePrice(q);
      const symUp = String(q.symbol || single).toUpperCase();
      if (!picked) {
        return NextResponse.json({ symbol: symUp, error: 'no usable price' });
      }
      return NextResponse.json({
        symbol: symUp,
        name: q.name,
        price: picked.value,
        change: parseFmpNumber(q.change) ?? 0,
        changesPercentage: parseFmpNumber(q.changesPercentage) ?? 0,
        previousClose: parseFmpNumber(q.previousClose),
        open: parseFmpNumber(q.open),
        _source: picked.source,
      });
    }

    const priceMap = {};
    const warnings = [];
    for (const q of quotes) {
      if (!q?.symbol) {
        warnings.push(`row missing symbol: ${JSON.stringify(q).slice(0, 100)}`);
        continue;
      }
      const sym = q.symbol.toUpperCase();
      const picked = pickTradePrice(q);

      if (!picked) {
        warnings.push(`${sym}: no usable price field`);
        continue;
      }
      if (picked.source !== 'price') {
        warnings.push(`${sym}: using ${picked.source} (price=${q.price})`);
      }

      priceMap[sym] = {
        price: picked.value,
        change: parseFmpNumber(q.change) ?? 0,
        changesPercentage: parseFmpNumber(q.changesPercentage) ?? 0,
        _source: picked.source,
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
