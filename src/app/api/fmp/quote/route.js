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
    return NextResponse.json({ error: 'FMP_API_KEY not configured' }, { status: 503 });
  }

  try {
    const ts = Date.now();
    const url = `${BASE}/quote/${encodeURIComponent(list)}?apikey=${encodeURIComponent(FMP_KEY)}&_ts=${ts}`;

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`FMP quote HTTP ${res.status}`);
    const data = await res.json();
    const quotes = Array.isArray(data) ? data : [data].filter(Boolean);

    if (single && !many) {
      return NextResponse.json(quotes[0] ?? {});
    }

    const priceMap = {};
    for (const q of quotes) {
      if (!q?.symbol) continue;
      const sym = String(q.symbol).toUpperCase();

      let chosen = null;
      let source = 'price';
      const p = typeof q.price === 'number' ? q.price : Number(q.price);
      if (Number.isFinite(p) && p > 0) {
        chosen = p;
        source = 'price';
      } else {
        const pc = typeof q.previousClose === 'number' ? q.previousClose : Number(q.previousClose);
        if (Number.isFinite(pc) && pc > 0) {
          chosen = pc;
          source = 'previousClose';
        } else {
          const o = typeof q.open === 'number' ? q.open : Number(q.open);
          if (Number.isFinite(o) && o > 0) {
            chosen = o;
            source = 'open';
          }
        }
      }

      if (chosen === null) {
        console.warn(`[fmp/quote] ${sym}: no usable price field in response row:`, q);
        continue;
      }

      const ch = typeof q.change === 'number' ? q.change : Number(q.change);
      const cp = typeof q.changesPercentage === 'number' ? q.changesPercentage : Number(q.changesPercentage);
      priceMap[sym] = {
        price: chosen,
        change: Number.isFinite(ch) ? ch : 0,
        changesPercentage: Number.isFinite(cp) ? cp : 0,
        _source: source,
      };
    }

    return NextResponse.json({ quotes, priceMap });
  } catch (err) {
    console.error('[fmp/quote] error:', err.message);
    return NextResponse.json(
      { error: err.message, quotes: [], priceMap: {} },
      { status: 200 }
    );
  }
}
