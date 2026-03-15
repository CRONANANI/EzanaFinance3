import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const searchRes = await fetch(
      `https://gamma-api.polymarket.com/public-search?query=${encodeURIComponent(username)}&type=profiles`,
      { next: { revalidate: 60 } }
    );

    if (!searchRes.ok) {
      return NextResponse.json({ error: `Polymarket search failed: ${searchRes.status}` }, { status: searchRes.status });
    }

    const searchData = await searchRes.json();
    const profiles = searchData?.profiles || searchData || [];
    const profile = Array.isArray(profiles) ? profiles[0] : profiles;

    if (!profile || !profile.proxyWallet) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const wallet = profile.proxyWallet;

    const [positionsRes, tradesRes] = await Promise.all([
      fetch(`https://data-api.polymarket.com/positions?user=${wallet}&sizeThreshold=0.1`, { next: { revalidate: 30 } }),
      fetch(`https://data-api.polymarket.com/trades?user=${wallet}&limit=50`, { next: { revalidate: 30 } }),
    ]);

    const positions = positionsRes.ok ? await positionsRes.json() : [];
    const trades = tradesRes.ok ? await tradesRes.json() : [];

    const positionsArr = Array.isArray(positions) ? positions : [];
    const tradesArr = Array.isArray(trades) ? trades : [];

    return NextResponse.json({
      profile: {
        username: profile.pseudonym || profile.name || username,
        name: profile.name || profile.pseudonym || username,
        bio: profile.bio || '',
        profileImage: profile.profileImage || '',
        proxyWallet: wallet,
        url: profile.url || '',
      },
      positions: positionsArr,
      trades: tradesArr,
      stats: {
        totalPositionsValue: positionsArr.reduce((sum, p) => sum + (parseFloat(p.currentValue) || 0), 0),
        openPositions: positionsArr.length,
        totalTrades: tradesArr.length,
      },
    });
  } catch (error) {
    console.error('Polymarket profile error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile', details: error?.message }, { status: 500 });
  }
}
