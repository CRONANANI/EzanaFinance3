import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const BASE = 'https://financialmodelingprep.com/stable/stock-peers';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || '').toUpperCase().trim();
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '3', 10), 1), 10);

  if (!symbol) {
    return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  }
  if (!FMP_KEY) {
    return NextResponse.json({ error: 'FMP_API_KEY not configured', peers: [] }, { status: 503 });
  }

  const url = `${BASE}?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(FMP_KEY)}`;

  try {
    console.log('[fmp/peers] upstream:', url.replace(FMP_KEY, '***'));
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      let body = '';
      try {
        body = await res.text();
      } catch {
        /* ignore */
      }
      console.error(`[fmp/peers] FMP HTTP ${res.status}:`, body.slice(0, 300));
      return NextResponse.json({ error: `FMP HTTP ${res.status}`, peers: [] }, { status: 200 });
    }

    const data = await res.json();

    let rawPeers = [];
    if (Array.isArray(data)) {
      rawPeers = data;
    } else if (Array.isArray(data?.peersList)) {
      rawPeers = data.peersList;
    } else if (Array.isArray(data?.peers)) {
      rawPeers = data.peers;
    }

    const peers = [];
    for (const item of rawPeers) {
      if (typeof item === 'string') {
        const s = item.trim().toUpperCase();
        if (s && s !== symbol) peers.push(s);
      } else if (item && typeof item === 'object') {
        const s = (item.symbol || item.ticker || '').toString().trim().toUpperCase();
        if (s && s !== symbol) peers.push(s);
      }
      if (peers.length >= limit) break;
    }

    console.log(`[fmp/peers] ${symbol}: returning ${peers.length} peers`, peers);
    return NextResponse.json({ symbol, peers });
  } catch (err) {
    console.error('[fmp/peers] threw:', err?.message);
    return NextResponse.json({ error: err?.message || 'unknown error', peers: [] }, { status: 200 });
  }
}
