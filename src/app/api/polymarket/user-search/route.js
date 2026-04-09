import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Proxy Polymarket gamma public-search for profile discovery (partial username / name). */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return NextResponse.json({ profiles: [] });
  }

  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/public-search?query=${encodeURIComponent(q)}&type=profiles`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      return NextResponse.json({ profiles: [] });
    }
    const data = await res.json();
    const raw = data?.profiles ?? data?.results ?? [];
    const list = Array.isArray(raw) ? raw : [];
    const profiles = list.map((p) => ({
      name: p.name || p.pseudonym || 'Trader',
      username: p.pseudonym || p.name || '',
      proxyWallet: p.proxyWallet || p.address || '',
      address: p.proxyWallet || p.address || '',
      profileImage: p.profileImage || '',
      profitLoss: p.profitLoss ?? p.pnl ?? null,
    }));
    return NextResponse.json({ profiles });
  } catch (e) {
    console.error('[polymarket/user-search]', e);
    return NextResponse.json({ profiles: [] });
  }
}
