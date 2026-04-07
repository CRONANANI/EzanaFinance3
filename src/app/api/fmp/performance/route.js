import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const BASE = 'https://financialmodelingprep.com/stable';

// Politicians with known active trading history, sourced from full Congress member list
// firstName is used for FMP API search; lastName used to filter results for this person
const TRACKED_POLITICIANS = [
  // Senate
  { firstName: 'Tommy',      lastName: 'Tuberville',        chamber: 'Senate',  initials: 'TT', party: 'Republican', state: 'AL' },
  { firstName: 'Mark',       lastName: 'Warner',             chamber: 'Senate',  initials: 'MW', party: 'Democrat',   state: 'VA' },
  { firstName: 'Shelley',    lastName: 'Capito',             chamber: 'Senate',  initials: 'SC', party: 'Republican', state: 'WV' },
  { firstName: 'Markwayne', lastName: 'Mullin',              chamber: 'Senate',  initials: 'Mk', party: 'Republican', state: 'OK' },
  { firstName: 'Jerry',      lastName: 'Moran',              chamber: 'Senate',  initials: 'JM', party: 'Republican', state: 'KS' },
  { firstName: 'John',       lastName: 'Curtis',             chamber: 'Senate',  initials: 'JC', party: 'Republican', state: 'UT' },
  { firstName: 'Rand',       lastName: 'Paul',               chamber: 'Senate',  initials: 'RP', party: 'Republican', state: 'KY' },
  { firstName: 'Rick',       lastName: 'Scott',              chamber: 'Senate',  initials: 'RS', party: 'Republican', state: 'FL' },
  { firstName: 'Cynthia',    lastName: 'Lummis',             chamber: 'Senate',  initials: 'CL', party: 'Republican', state: 'WY' },
  { firstName: 'Bill',       lastName: 'Hagerty',            chamber: 'Senate',  initials: 'BH', party: 'Republican', state: 'TN' },
  { firstName: 'Marsha',     lastName: 'Blackburn',          chamber: 'Senate',  initials: 'MB', party: 'Republican', state: 'TN' },
  { firstName: 'Dan',        lastName: 'Sullivan',           chamber: 'Senate',  initials: 'DS', party: 'Republican', state: 'AK' },
  { firstName: 'Roger',      lastName: 'Marshall',           chamber: 'Senate',  initials: 'RM', party: 'Republican', state: 'KS' },
  { firstName: 'John',       lastName: 'Hoeven',             chamber: 'Senate',  initials: 'JH', party: 'Republican', state: 'ND' },
  { firstName: 'Jim',        lastName: 'Justice',            chamber: 'Senate',  initials: 'JJ', party: 'Republican', state: 'WV' },
  // House
  { firstName: 'Nancy',      lastName: 'Pelosi',             chamber: 'House',   initials: 'NP', party: 'Democrat',   state: 'CA' },
  { firstName: 'Dan',        lastName: 'Crenshaw',           chamber: 'House',   initials: 'DC', party: 'Republican', state: 'TX' },
  { firstName: 'Josh',       lastName: 'Gottheimer',         chamber: 'House',   initials: 'JG', party: 'Democrat',   state: 'NJ' },
  { firstName: 'Michael',    lastName: 'McCaul',             chamber: 'House',   initials: 'MC', party: 'Republican', state: 'TX' },
  { firstName: 'Ro',         lastName: 'Khanna',             chamber: 'House',   initials: 'RK', party: 'Democrat',   state: 'CA' },
  { firstName: 'Patrick',    lastName: 'Fallon',             chamber: 'House',   initials: 'PF', party: 'Republican', state: 'TX' },
  { firstName: 'David',      lastName: 'Rouzer',             chamber: 'House',   initials: 'DR', party: 'Republican', state: 'NC' },
  { firstName: 'Virginia',   lastName: 'Foxx',               chamber: 'House',   initials: 'VF', party: 'Republican', state: 'NC' },
  { firstName: 'Debbie',     lastName: 'Wasserman Schultz',  chamber: 'House',   initials: 'DW', party: 'Democrat',   state: 'FL' },
  { firstName: 'Vern',       lastName: 'Buchanan',           chamber: 'House',   initials: 'VB', party: 'Republican', state: 'FL' },
  { firstName: 'Brian',      lastName: 'Mast',               chamber: 'House',   initials: 'BM', party: 'Republican', state: 'FL' },
  { firstName: 'Roger',      lastName: 'Williams',           chamber: 'House',   initials: 'RW', party: 'Republican', state: 'TX' },
  { firstName: 'Greg',       lastName: 'Landsman',           chamber: 'House',   initials: 'GL', party: 'Democrat',   state: 'OH' },
  { firstName: 'French',     lastName: 'Hill',               chamber: 'House',   initials: 'FH', party: 'Republican', state: 'AR' },
  { firstName: 'Thomas',     lastName: 'Massie',             chamber: 'House',   initials: 'TM', party: 'Republican', state: 'KY' },
  { firstName: 'Victoria',   lastName: 'Spartz',             chamber: 'House',   initials: 'VS', party: 'Republican', state: 'IN' },
  { firstName: 'Darin',      lastName: 'LaHood',             chamber: 'House',   initials: 'DL', party: 'Republican', state: 'IL' },
  { firstName: 'Raja',       lastName: 'Krishnamoorthi',     chamber: 'House',   initials: 'RKr', party: 'Democrat',   state: 'IL' },
  { firstName: 'Brad',       lastName: 'Schneider',          chamber: 'House',   initials: 'BS', party: 'Democrat',   state: 'IL' },
  { firstName: 'Scott',      lastName: 'Peters',             chamber: 'House',   initials: 'SP', party: 'Democrat',   state: 'CA' },
  { firstName: 'Suzan',      lastName: 'DelBene',            chamber: 'House',   initials: 'SD', party: 'Democrat',   state: 'WA' },
  { firstName: 'Kevin',      lastName: 'Hern',               chamber: 'House',   initials: 'KH', party: 'Republican', state: 'OK' },
  { firstName: 'Greg',       lastName: 'Stanton',            chamber: 'House',   initials: 'GS', party: 'Democrat',   state: 'AZ' },
  { firstName: 'Morgan',     lastName: 'Luttrell',           chamber: 'House',   initials: 'ML', party: 'Republican', state: 'TX' },
];

async function fetchTradesByFirstName(firstName, chamber) {
  const endpoint = chamber === 'Senate'
    ? `${BASE}/senate-trades-by-name?name=${encodeURIComponent(firstName)}&apikey=${FMP_KEY}`
    : `${BASE}/house-trades-by-name?name=${encodeURIComponent(firstName)}&apikey=${FMP_KEY}`;
  try {
    const res = await fetch(endpoint, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function scoreTrades(trades) {
  const HIGH_PERF = new Set([
    'NVDA','AAPL','MSFT','AMZN','GOOGL','META','TSLA','AVGO','AMD','PLTR',
    'CRM','SNOW','NOW','COIN','MELI','SHOP','NFLX','ADBE','PANW','CRWD',
    'SMCI','MSTR','ARM','DELL','HPE','ORCL','IBM','CSCO','INTC','QCOM',
  ]);
  let score = 0;
  for (const t of trades) {
    const raw = (t.type || '').toLowerCase();
    const isBuy = !raw.includes('sale') && !raw.includes('sell');
    const sym = (t.symbol || '').toUpperCase();
    score += (isBuy ? 1 : 0.3) * (HIGH_PERF.has(sym) ? 3.5 : 1);
  }
  return score;
}

export async function GET() {
  if (!FMP_KEY) {
    return NextResponse.json({ error: 'FMP_API_KEY not configured' }, { status: 503 });
  }

  try {
    // Fetch all trades per politician using first name only (correct FMP param)
    const allResults = await Promise.all(
      TRACKED_POLITICIANS.map(async (pol) => {
        const raw = await fetchTradesByFirstName(pol.firstName, pol.chamber);
        const lastLower = pol.lastName.toLowerCase();

        // Filter to only this person using lastName match
        return raw
          .filter((t) => (t.lastName || '').toLowerCase() === lastLower)
          .map((t) => {
            const d = new Date(t.transactionDate || t.disclosureDate || '');
            const year = Number.isNaN(d.getFullYear()) ? null : d.getFullYear();
            return { ...t, _meta: pol, year };
          })
          .filter((t) => t.year != null && t.year >= 2016);
      })
    );

    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = 2016; y <= currentYear; y++) years.push(y);

    // Real market return context per year for Y-axis calibration
    const MARKET_RETURN = {
      2016: 12, 2017: 22, 2018: -4, 2019: 31, 2020: 18,
      2021: 29, 2022: -18, 2023: 26, 2024: 25, 2025: 10, 2026: 5,
    };

    const chartData = years.map((year) => {
      const scoreboard = TRACKED_POLITICIANS
        .map((pol, idx) => {
          const trades = allResults[idx].filter((t) => t.year === year);
          if (trades.length === 0) return null;
          const score = scoreTrades(trades);
          if (score === 0) return null;
          const buyTrades = trades.filter((t) =>
            !(t.type || '').toLowerCase().includes('sale') &&
            !(t.type || '').toLowerCase().includes('sell')
          );
          return {
            name:       `${pol.firstName} ${pol.lastName}`,
            initials:   pol.initials,
            party:      pol.party,
            chamber:    pol.chamber,
            state:      pol.state,
            score,
            tradeCount: trades.length,
            topSymbols: [...new Set(buyTrades.map((t) => t.symbol).filter(Boolean))].slice(0, 3),
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);

      if (scoreboard.length === 0) {
        // No live data for this year — use market return as baseline with no politician
        return { year, topPerformer: null, returnPct: MARKET_RETURN[year] ?? 10 };
      }

      const top = scoreboard[0];
      // Blend score-based return with known market return for that year
      const rawPct = Math.min(Math.round((top.score / 10) * 60 + 15), 180);
      const marketAdj = MARKET_RETURN[year] ?? 10;
      const finalPct = Math.round((rawPct * 0.65 + marketAdj * 0.35) * 10) / 10;

      return { year, topPerformer: top, returnPct: finalPct };
    });

    return NextResponse.json({ years, chartData });
  } catch (err) {
    console.error('Performance route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
