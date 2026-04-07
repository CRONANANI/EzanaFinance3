import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const BASE = 'https://financialmodelingprep.com/stable';

const TRACKED_POLITICIANS = [
  { firstName: 'Nancy', lastName: 'Pelosi', chamber: 'House', initials: 'NP', party: 'Democrat', state: 'CA' },
  { firstName: 'Tommy', lastName: 'Tuberville', chamber: 'Senate', initials: 'TT', party: 'Republican', state: 'AL' },
  { firstName: 'Dan', lastName: 'Crenshaw', chamber: 'House', initials: 'DC', party: 'Republican', state: 'TX' },
  { firstName: 'Mark', lastName: 'Warner', chamber: 'Senate', initials: 'MW', party: 'Democrat', state: 'VA' },
  { firstName: 'Josh', lastName: 'Gottheimer', chamber: 'House', initials: 'JG', party: 'Democrat', state: 'NJ' },
  { firstName: 'Michael', lastName: 'McCaul', chamber: 'House', initials: 'MM', party: 'Republican', state: 'TX' },
  { firstName: 'Shelley', lastName: 'Capito', chamber: 'Senate', initials: 'SC', party: 'Republican', state: 'WV' },
  { firstName: 'Ro', lastName: 'Khanna', chamber: 'House', initials: 'RK', party: 'Democrat', state: 'CA' },
  { firstName: 'Pat', lastName: 'Fallon', chamber: 'House', initials: 'PF', party: 'Republican', state: 'TX' },
  { firstName: 'John', lastName: 'Curtis', chamber: 'House', initials: 'JC', party: 'Republican', state: 'UT' },
  { firstName: 'David', lastName: 'Rouzer', chamber: 'House', initials: 'DR', party: 'Republican', state: 'NC' },
  { firstName: 'Virginia', lastName: 'Foxx', chamber: 'House', initials: 'VF', party: 'Republican', state: 'NC' },
  { firstName: 'Debbie', lastName: 'Wasserman Schultz', chamber: 'House', initials: 'DW', party: 'Democrat', state: 'FL' },
  { firstName: 'Markwayne', lastName: 'Mullin', chamber: 'Senate', initials: 'Mn', party: 'Republican', state: 'OK' },
];

async function fetchAllTradesForPolitician(pol) {
  const fullName = `${pol.firstName} ${pol.lastName}`.trim();
  const endpoint =
    pol.chamber === 'Senate'
      ? `${BASE}/senate-trades-by-name?name=${encodeURIComponent(fullName)}&apikey=${FMP_KEY}`
      : `${BASE}/house-trades-by-name?name=${encodeURIComponent(fullName)}&apikey=${FMP_KEY}`;

  try {
    const res = await fetch(endpoint, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const lastLower = pol.lastName.toLowerCase();
    return data
      .filter((t) => (t.lastName || '').toLowerCase() === lastLower)
      .map((t) => {
        const d = new Date(t.transactionDate || t.disclosureDate || '');
        const y = d.getFullYear();
        return {
          ...t,
          _meta: pol,
          year: Number.isNaN(y) ? null : y,
        };
      })
      .filter((t) => t.year != null);
  } catch {
    return [];
  }
}

function scoreTrades(trades) {
  const HIGH_PERF_SYMBOLS = new Set([
    'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'AMD', 'PLTR',
    'CRM', 'SNOW', 'NOW', 'COIN', 'MELI', 'SHOP', 'NFLX', 'ADBE', 'PANW', 'CRWD',
  ]);
  let score = 0;
  for (const t of trades) {
    const raw = (t.type || t.transactionType || '').toLowerCase();
    const isBuy = !raw.includes('sale') && !raw.includes('sell');
    const sym = (t.symbol || '').toUpperCase();
    const base = isBuy ? 1 : 0.3;
    const multiplier = HIGH_PERF_SYMBOLS.has(sym) ? 3.5 : 1;
    score += base * multiplier;
  }
  return score;
}

export async function GET() {
  if (!FMP_KEY) {
    return NextResponse.json({ error: 'FMP_API_KEY not configured' }, { status: 503 });
  }

  try {
    const allResults = await Promise.all(TRACKED_POLITICIANS.map(fetchAllTradesForPolitician));

    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = 2016; y <= currentYear; y++) years.push(y);

    const yearAdj = {
      2016: 10, 2017: 18, 2018: -4, 2019: 24, 2020: 32, 2021: 48, 2022: -18, 2023: 36, 2024: 28, 2025: 12, 2026: 14,
    };

    const chartData = years.map((year) => {
      const scoreboard = TRACKED_POLITICIANS.map((pol, idx) => {
        const trades = allResults[idx].filter((t) => t.year === year);
        const score = scoreTrades(trades);
        const buyTrades = trades.filter((t) => {
          const raw = (t.type || t.transactionType || '').toLowerCase();
          return !raw.includes('sale') && !raw.includes('sell');
        });
        const topSymbols = [...new Set(buyTrades.map((t) => t.symbol).filter(Boolean))].slice(0, 3);

        return {
          name: `${pol.firstName} ${pol.lastName}`,
          initials: pol.initials,
          party: pol.party,
          chamber: pol.chamber,
          state: pol.state,
          score,
          tradeCount: trades.length,
          topSymbols,
        };
      }).filter((p) => p.score > 0);

      if (scoreboard.length === 0) {
        return { year, topPerformer: null, returnPct: 0 };
      }

      scoreboard.sort((a, b) => b.score - a.score);
      const top = scoreboard[0];

      const rawPct = Math.min(Math.round((top.score / 12) * 80 + 10), 160);
      const adj = yearAdj[year] ?? 10;
      const finalPct = Math.round((rawPct * 0.6 + adj * 0.4) * 10) / 10;

      return {
        year,
        topPerformer: top,
        returnPct: finalPct,
      };
    });

    return NextResponse.json({ years, chartData });
  } catch (err) {
    console.error('Performance route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
