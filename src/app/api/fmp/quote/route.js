import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const STABLE_BASE = 'https://financialmodelingprep.com/stable';

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

/**
 * Fetch a single ticker from FMP's stable quote endpoint.
 * Returns the parsed quote object or null on failure.
 */
async function fetchOneQuote(symbol) {
  if (!symbol) return null;
  const url = `${STABLE_BASE}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(FMP_KEY)}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[fmp/quote] ${symbol}: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    // FMP stable/quote returns an array of 1 element for a valid symbol
    const q = Array.isArray(data) ? data[0] : data;
    if (!q || typeof q !== 'object') {
      console.warn(`[fmp/quote] ${symbol}: empty response`);
      return null;
    }
    return q;
  } catch (err) {
    console.warn(`[fmp/quote] ${symbol}: fetch threw —`, err?.message);
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const single = (searchParams.get('symbol') || '').toUpperCase().trim();
  const many = (searchParams.get('symbols') || '').toUpperCase().trim();

  if (!single && !many) {
    return NextResponse.json({ error: 'symbol(s) required' }, { status: 400 });
  }
  if (!FMP_KEY) {
    console.error('[fmp/quote] FMP_API_KEY missing');
    return NextResponse.json(
      { error: 'FMP_API_KEY not configured', quotes: [], priceMap: {} },
      { status: 503 }
    );
  }

  // ── Single-symbol mode ──
  if (single && !many) {
    const q = await fetchOneQuote(single);
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

  // ── Multi-symbol mode (parallel per-ticker fetches) ──
  const symbols = many.split(',').map((s) => s.trim()).filter(Boolean);
  console.log(`[fmp/quote] parallel fetching ${symbols.length} symbols:`, symbols.join(','));

  // Fire all fetches in parallel — no batch endpoint, no complex payload
  const results = await Promise.all(symbols.map((sym) => fetchOneQuote(sym)));

  const quotes = [];
  const priceMap = {};
  const warnings = [];

  for (let i = 0; i < symbols.length; i += 1) {
    const requestedSym = symbols[i];
    const q = results[i];

    if (!q) {
      warnings.push(`${requestedSym}: fetch returned null`);
      continue;
    }

    const picked = pickTradePrice(q);
    if (!picked) {
      warnings.push(`${requestedSym}: no usable price field`);
      continue;
    }

    // Use the symbol FMP returned if present, otherwise fall back to what
    // we asked for. Normalize to uppercase so the client can look up
    // consistently regardless of what case FMP returns.
    const responseSym = (q.symbol || requestedSym).toString().toUpperCase();
    const keySym = responseSym || requestedSym.toUpperCase();

    if (picked.source !== 'price') {
      warnings.push(`${keySym}: using ${picked.source} (price=${q.price})`);
    }

    quotes.push({
      symbol: keySym,
      name: q.name,
      price: picked.value,
      change: parseFmpNumber(q.change) ?? 0,
      changesPercentage: parseFmpNumber(q.changesPercentage) ?? 0,
      previousClose: parseFmpNumber(q.previousClose),
      open: parseFmpNumber(q.open),
    });

    priceMap[keySym] = {
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
    `[fmp/quote] priceMap has ${Object.keys(priceMap).length}/${symbols.length} entries`
  );

  return NextResponse.json({ quotes, priceMap, warnings });
}
