import { NextResponse } from 'next/server';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const BASE = 'https://finnhub.io/api/v1';

const CITY_TICKERS = {
  'new-york': ['AAPL', 'MSFT', 'JPM', 'GS'],
  toronto: ['RY', 'TD', 'ENB', 'CNQ'],
  'sao-paulo': ['VALE', 'PBR', 'ITUB'],
  london: ['SHEL', 'HSBC', 'BP', 'AZN'],
  frankfurt: ['SAP', 'SIE.DE', 'ALV.DE'],
  dubai: ['XOM', 'CVX', 'COP'],
  mumbai: ['INFY', 'WIT', 'HDB', 'IBN'],
  singapore: ['SE', 'DBSDY'],
  'hong-kong': ['BABA', 'BIDU', 'JD', 'TCEHY'],
  shanghai: ['BABA', 'NIO', 'PDD', 'LI'],
  tokyo: ['TM', 'SONY', 'MUFG', 'NMR'],
  sydney: ['BHP', 'RIO', 'WBK'],
  johannesburg: ['AGL.JO', 'SOL.JO', 'NPN.JO'],
  'addis-ababa': [],
  lagos: ['DANGCEM.LG', 'GTCO.LG'],
  moscow: ['SBER.ME', 'GAZP.ME', 'LKOH.ME'],
  paris: ['MC.PA', 'OR.PA', 'SAN.PA', 'TTE.PA'],
  'tel-aviv': ['TEVA', 'CHKP', 'NICE', 'CYBR'],
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get('city');

    if (!cityId) return NextResponse.json({ error: 'city param required' }, { status: 400 });

    const tickers = CITY_TICKERS[cityId] || [];

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const [generalRes, ...companyResults] = await Promise.all([
      fetch(`${BASE}/news?category=general&token=${FINNHUB_KEY}`),
      ...tickers.slice(0, 3).map((ticker) =>
        fetch(`${BASE}/company-news?symbol=${ticker}&from=${weekAgo}&to=${today}&token=${FINNHUB_KEY}`)
      ),
    ]);

    const generalNews = await generalRes.json();
    const companyNews = [];
    for (const result of companyResults) {
      const data = await result.json();
      companyNews.push(...(Array.isArray(data) ? data : []).slice(0, 5));
    }

    const allNews = [...companyNews, ...(Array.isArray(generalNews) ? generalNews : []).slice(0, 10)];
    const seen = new Set();
    const unique = allNews.filter((n) => {
      const key = n.headline || n.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    unique.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));

    const formatted = unique.slice(0, 15).map((n) => ({
      id: n.id || n.headline?.slice(0, 20),
      category: (n.category || 'MARKETS').toUpperCase(),
      title: n.headline || 'Market Update',
      summary: n.summary,
      source: n.source || 'Finnhub',
      url: n.url || '#',
      image: n.image,
      time: n.datetime,
      related: n.related,
    }));

    return NextResponse.json(
      { news: formatted },
      {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message, news: [] }, { status: 500 });
  }
}
