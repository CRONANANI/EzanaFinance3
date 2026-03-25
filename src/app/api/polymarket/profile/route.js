import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const wallet = searchParams.get('wallet');

    if (!username && !wallet) {
      return NextResponse.json({ error: 'Username or wallet is required' }, { status: 400 });
    }

    let resolvedWallet = wallet;
    let profile = null;

    if (username && !wallet) {
      const searchRes = await fetch(
        `https://gamma-api.polymarket.com/public-search?query=${encodeURIComponent(username)}&type=profiles`,
        { next: { revalidate: 60 } }
      );

      if (!searchRes.ok) {
        return NextResponse.json(
          { error: `Polymarket search failed: ${searchRes.status}` },
          { status: searchRes.status }
        );
      }

      const searchData = await searchRes.json();
      const profiles = searchData?.profiles || searchData || [];
      profile = Array.isArray(profiles) ? profiles[0] : profiles;

      if (!profile || !profile.proxyWallet) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      resolvedWallet = profile.proxyWallet;
    }

    const [positionsRes, tradesRes, activityRes] = await Promise.all([
      fetch(`https://data-api.polymarket.com/positions?user=${resolvedWallet}&sizeThreshold=0.1`, { next: { revalidate: 30 } }),
      fetch(`https://data-api.polymarket.com/trades?user=${resolvedWallet}&limit=100`, { next: { revalidate: 30 } }),
      fetch(`https://data-api.polymarket.com/activity?user=${resolvedWallet}&limit=50`, { next: { revalidate: 30 } }),
    ]);

    const positions = positionsRes.ok ? await positionsRes.json() : [];
    const trades = tradesRes.ok ? await tradesRes.json() : [];
    const activity = activityRes.ok ? await activityRes.json() : [];

    const positionsArr = Array.isArray(positions) ? positions : [];
    const tradesArr = Array.isArray(trades) ? trades : [];
    const activityArr = Array.isArray(activity) ? activity : [];

    const totalPositionsValue = positionsArr.reduce(
      (sum, p) => sum + (parseFloat(p.currentValue) || 0),
      0
    );
    const totalPnl = positionsArr.reduce(
      (sum, p) => sum + (parseFloat(p.cashPnl) || parseFloat(p.pnl) || 0),
      0
    );
    const totalPercentPnl = positionsArr.reduce(
      (sum, p) => sum + (parseFloat(p.percentPnl) || 0),
      0
    );
    const avgPercentPnl = positionsArr.length > 0 ? totalPercentPnl / positionsArr.length : 0;

    const buys = tradesArr.filter((t) => t.side?.toUpperCase() === 'BUY');
    const sells = tradesArr.filter((t) => t.side?.toUpperCase() === 'SELL');
    const avgBuyPrice =
      buys.length > 0
        ? buys.reduce((s, t) => s + (parseFloat(t.price) || 0), 0) / buys.length
        : 0;

    const marketCategories = {};
    positionsArr.forEach((p) => {
      const title = (p.title || p.market || '').toLowerCase();
      let cat = 'other';
      if (/president|election|congress|trump|biden|democrat|republican|vote|governor|senate/.test(title)) cat = 'politics';
      else if (/bitcoin|ethereum|crypto|btc|eth|solana|defi/.test(title)) cat = 'crypto';
      else if (/rate|gdp|recession|fed|inflation|s&p|market|economy|tariff/.test(title)) cat = 'economics';
      else if (/ai|tesla|apple|spacex|tech|openai|google|nvidia|microsoft/.test(title)) cat = 'tech';
      else if (/nba|nfl|mlb|soccer|sport|super bowl|champion|world cup/.test(title)) cat = 'sports';
      else cat = 'culture';

      if (!marketCategories[cat]) marketCategories[cat] = { count: 0, value: 0, pnl: 0 };
      marketCategories[cat].count++;
      marketCategories[cat].value += parseFloat(p.currentValue) || 0;
      marketCategories[cat].pnl += parseFloat(p.cashPnl) || parseFloat(p.pnl) || 0;
    });

    return NextResponse.json({
      profile: profile
        ? {
            username: profile.pseudonym || profile.name || username,
            name: profile.name || profile.pseudonym || username,
            bio: profile.bio || '',
            profileImage: profile.profileImage || '',
            proxyWallet: resolvedWallet,
            url: profile.url || '',
          }
        : { username: username || resolvedWallet, proxyWallet: resolvedWallet },
      positions: positionsArr,
      trades: tradesArr,
      activity: activityArr,
      stats: {
        totalPositionsValue,
        openPositions: positionsArr.length,
        totalTrades: tradesArr.length,
        totalPnl,
        avgPercentPnl,
        buyCount: buys.length,
        sellCount: sells.length,
        avgBuyPrice,
      },
      analytics: {
        categoryBreakdown: marketCategories,
      },
    });
  } catch (error) {
    console.error('Polymarket profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error?.message },
      { status: 500 }
    );
  }
}
