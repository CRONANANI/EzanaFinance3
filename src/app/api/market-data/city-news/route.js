import { NextResponse } from 'next/server';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const BASE = 'https://finnhub.io/api/v1';

const CITY_KEYWORDS = {
  'new-york': ['new york', 'nyc', 'wall street', 'nasdaq', 'nyse', 'fed ', 'federal reserve', 'us economy', 'us market', 'american', 'united states'],
  toronto: ['toronto', 'canada', 'canadian', 'tsx', 'bank of canada', 'loonie'],
  'sao-paulo': ['brazil', 'brazilian', 'bovespa', 'sao paulo', 'são paulo', 'real ', 'bcb'],
  london: ['london', 'uk ', 'united kingdom', 'britain', 'british', 'ftse', 'bank of england', 'boe', 'sterling', 'pound'],
  frankfurt: ['frankfurt', 'german', 'germany', 'ecb', 'european central bank', 'dax', 'eurozone', 'euro '],
  dubai: ['dubai', 'uae', 'emirates', 'abu dhabi', 'opec', 'middle east', 'gulf', 'saudi'],
  mumbai: ['mumbai', 'india', 'indian', 'sensex', 'nifty', 'rbi', 'rupee'],
  singapore: ['singapore', 'sgx', 'mas ', 'asean'],
  'hong-kong': ['hong kong', 'hongkong', 'hkex', 'hang seng', 'hsi'],
  shanghai: ['shanghai', 'china', 'chinese', 'pboc', 'beijing', 'csi', 'sse'],
  tokyo: ['tokyo', 'japan', 'japanese', 'nikkei', 'boj', 'bank of japan', 'yen', 'yen '],
  sydney: ['sydney', 'australia', 'australian', 'asx', 'rba', 'aussie'],
  johannesburg: ['johannesburg', 'south africa', 'jse', 'rand', 'african'],
  'addis-ababa': ['ethiopia', 'addis ababa', 'african union', 'east africa'],
  lagos: ['lagos', 'nigeria', 'nigerian', 'ngx', 'naira', 'west africa'],
  moscow: ['moscow', 'russia', 'russian', 'moex', 'ruble', 'kremlin'],
  paris: ['paris', 'france', 'french', 'cac 40', 'euronext', 'macron'],
  'tel-aviv': ['tel aviv', 'israel', 'israeli', 'tase', 'shekel', 'teva'],
  miami: ['miami', 'florida', 'south florida', 'fintech', 'crypto'],
  'san-francisco': ['san francisco', 'silicon valley', 'bay area', 'tech', 'startup', 'venture'],
  chicago: ['chicago', 'cme', 'cboe', 'futures', 'options', 'derivatives', 'midwest'],
  seoul: ['seoul', 'korea', 'korean', 'kospi', 'samsung', 'sk hynix'],
  geneva: ['geneva', 'switzerland', 'swiss', 'zurich', 'six exchange'],
  dublin: ['dublin', 'ireland', 'irish', 'euronext dublin'],
  stockholm: ['stockholm', 'sweden', 'swedish', 'nordic', 'nasdaq nordic'],
  montreal: ['montreal', 'quebec', 'canada', 'canadian', 'tmx'],
  hamilton: ['bermuda', 'hamilton', 'reinsurance', 'offshore'],
  auckland: ['auckland', 'new zealand', 'nzx', 'fonterra', 'kiwi', 'australasia'],
  melbourne: ['melbourne', 'victoria', 'australia', 'australian', 'asx', 'superannuation'],
  nairobi: ['nairobi', 'kenya', 'kenyan', 'east africa', 'nse', 'm-pesa', 'safaricom'],
  santiago: ['santiago', 'chile', 'chilean', 'copper', 'ipsa', 'latam'],
  lima: ['lima', 'peru', 'peruvian', 'sol ', 'bvl', 'mining', 'copper'],
  bogota: ['bogota', 'bogotá', 'colombia', 'colombian', 'peso', 'bvc', 'oil'],
  medellin: ['medellin', 'medellín', 'antioquia', 'colombia', 'colombian', 'innovation'],
  'buenos-aires': ['buenos aires', 'argentina', 'argentine', 'peso', 'milei', 'mercosur', 'byma'],
  boston: ['boston', 'massachusetts', 'biotech', 'pharma', 'harvard', 'mit ', 'endowment', 'fidelity'],
};

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
  miami: ['HOOD', 'COIN', 'SQ'],
  'san-francisco': ['CRM', 'UBER', 'ABNB', 'PLTR'],
  chicago: ['CME', 'CBOE', 'NDAQ'],
  seoul: ['005930.KS', '000660.KS'],
  geneva: ['NESN.SW', 'ROG.SW', 'NOVN.SW'],
  dublin: ['CRH', 'LSEG', 'AIB.IR'],
  stockholm: ['ERIC-B.ST', 'VOLV-B.ST', 'ABB.ST'],
  montreal: ['BMO', 'BN', 'NTR'],
  hamilton: ['RNR', 'ACGL', 'AXS'],
  auckland: ['AIR.NZ', 'FPH.NZ'],
  melbourne: ['BHP', 'CBA.AX', 'RIO'],
  nairobi: ['SCOM.NR', 'EQTY.NR'],
  santiago: ['SQM', 'CMPC', 'ENELAM.SN'],
  lima: ['BAP', 'SCCO'],
  bogota: ['CIB', 'EC'],
  medellin: ['CIB', 'EC'],
  'buenos-aires': ['MELI', 'YPF', 'GGAL'],
  boston: ['MRNA', 'BIIB', 'AMGN', 'LLY'],
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

    const keywords = CITY_KEYWORDS[cityId] || [];
    const relevant = unique.filter((article) => {
      const text = `${article.headline || ''} ${article.summary || ''} ${article.related || ''}`.toLowerCase();
      return keywords.some(kw => text.includes(kw));
    });
    const finalNews = relevant.length >= 3 ? relevant : unique;

    const formatted = finalNews.slice(0, 15).map((n) => ({
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
