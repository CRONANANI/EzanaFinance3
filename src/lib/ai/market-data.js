const FMP_BASE = 'https://financialmodelingprep.com/api';
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function cacheKey(endpoint) {
  return endpoint;
}

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

async function fmpFetch(path) {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) throw new Error('FMP_API_KEY is not set');

  const key = cacheKey(path);
  const cached = getFromCache(key);
  if (cached) return cached;

  const sep = path.includes('?') ? '&' : '?';
  const url = `${FMP_BASE}${path}${sep}apikey=${apiKey}`;

  const res = await fetch(url, { next: { revalidate: 300 } });

  if (!res.ok) {
    console.error(`FMP API error: ${res.status} for ${path}`);
    return null;
  }

  const data = await res.json();
  setCache(key, data);
  return data;
}

export async function fetchMarketData(ticker) {
  const symbol = ticker.toUpperCase().trim();

  const [quote, ratios, income, estimates, institutional, insider, earnings, profile] =
    await Promise.all([
      fmpFetch(`/v3/quote/${symbol}`),
      fmpFetch(`/v3/ratios-ttm/${symbol}`),
      fmpFetch(`/v3/income-statement/${symbol}?period=quarter&limit=4`),
      fmpFetch(`/v3/analyst-estimates/${symbol}?limit=1`),
      fmpFetch(`/v3/institutional-holder/${symbol}`),
      fmpFetch(`/v4/insider-trading?symbol=${symbol}&limit=20`),
      fmpFetch(`/v3/earnings-surprises/${symbol}`),
      fmpFetch(`/v3/profile/${symbol}`),
    ]);

  return {
    ticker: symbol,
    fetchedAt: new Date().toISOString(),
    quote: quote?.[0] ?? null,
    profile: profile?.[0] ?? null,
    ratios: ratios?.[0] ?? null,
    incomeStatements: income ?? [],
    analystEstimates: estimates?.[0] ?? null,
    institutionalHolders: (institutional ?? []).slice(0, 15),
    insiderTrades: insider ?? [],
    earningsSurprises: (earnings ?? []).slice(0, 4),
  };
}

export function formatMarketDataForPrompt(data) {
  if (!data) return 'No market data available.';

  const sections = [];

  if (data.profile) {
    const p = data.profile;
    sections.push(
      `## Company Profile\n` +
      `Name: ${p.companyName}\nTicker: ${data.ticker}\nSector: ${p.sector}\nIndustry: ${p.industry}\n` +
      `Market Cap: $${fmt(p.mktCap)}\nEmployees: ${(p.fullTimeEmployees ?? 'N/A').toLocaleString()}\n` +
      `Description: ${(p.description ?? '').slice(0, 300)}…`
    );
  }

  if (data.quote) {
    const q = data.quote;
    sections.push(
      `## Current Quote\n` +
      `Price: $${q.price}\nChange: ${q.change} (${q.changesPercentage}%)\n` +
      `Day Range: $${q.dayLow} – $${q.dayHigh}\n52-Week Range: $${q.yearLow} – $${q.yearHigh}\n` +
      `Volume: ${fmt(q.volume)}\nAvg Volume: ${fmt(q.avgVolume)}\nMarket Cap: $${fmt(q.marketCap)}\nP/E: ${q.pe ?? 'N/A'}\nEPS: ${q.eps ?? 'N/A'}`
    );
  }

  if (data.ratios) {
    const r = data.ratios;
    sections.push(
      `## Key Financial Ratios (TTM)\n` +
      `P/E: ${rd(r.peRatioTTM)}\nPEG: ${rd(r.pegRatioTTM)}\nP/B: ${rd(r.priceToBookRatioTTM)}\n` +
      `ROE: ${pct(r.returnOnEquityTTM)}\nROA: ${pct(r.returnOnAssetsTTM)}\n` +
      `Debt/Equity: ${rd(r.debtEquityRatioTTM)}\nCurrent Ratio: ${rd(r.currentRatioTTM)}\n` +
      `Gross Margin: ${pct(r.grossProfitMarginTTM)}\nNet Margin: ${pct(r.netProfitMarginTTM)}\n` +
      `FCF Yield: ${pct(r.freeCashFlowPerShareTTM ? r.freeCashFlowPerShareTTM : null)}\n` +
      `Dividend Yield: ${pct(r.dividendYieldTTM)}`
    );
  }

  if (data.incomeStatements?.length) {
    sections.push(
      `## Income Statements (Last ${data.incomeStatements.length} Quarters)\n` +
      data.incomeStatements
        .map(
          (s) =>
            `${s.period} ${s.calendarYear}: Revenue $${fmt(s.revenue)} | Gross Profit $${fmt(s.grossProfit)} | Net Income $${fmt(s.netIncome)} | EPS $${s.eps}`
        )
        .join('\n')
    );
  }

  if (data.earningsSurprises?.length) {
    sections.push(
      `## Earnings Surprises (Last ${data.earningsSurprises.length} Quarters)\n` +
      data.earningsSurprises
        .map(
          (e) =>
            `${e.date}: Actual $${e.actualEarningResult} vs Est $${e.estimatedEarning} (${e.actualEarningResult > e.estimatedEarning ? 'BEAT' : 'MISS'})`
        )
        .join('\n')
    );
  }

  if (data.analystEstimates) {
    const a = data.analystEstimates;
    sections.push(
      `## Analyst Estimates\n` +
      `Est. Revenue: $${fmt(a.estimatedRevenueAvg)}\nEst. EPS: $${a.estimatedEpsAvg}\n` +
      `Number of Analysts: ${a.numberAnalystEstimatedRevenue ?? 'N/A'}`
    );
  }

  if (data.insiderTrades?.length) {
    const buys = data.insiderTrades.filter((t) => t.acquistionOrDisposition === 'A');
    const sells = data.insiderTrades.filter((t) => t.acquistionOrDisposition === 'D');
    sections.push(
      `## Insider Trading (Last 90 Days)\n` +
      `Buys: ${buys.length} transactions | Sells: ${sells.length} transactions\n` +
      data.insiderTrades
        .slice(0, 8)
        .map(
          (t) =>
            `${t.transactionDate}: ${t.reportingName} — ${t.acquistionOrDisposition === 'A' ? 'BUY' : 'SELL'} ${fmt(t.securitiesTransacted)} shares at $${t.price}`
        )
        .join('\n')
    );
  }

  if (data.institutionalHolders?.length) {
    sections.push(
      `## Top Institutional Holders\n` +
      data.institutionalHolders
        .slice(0, 8)
        .map((h) => `${h.holder}: ${fmt(h.shares)} shares ($${fmt(h.value)}) — ${h.dateReported}`)
        .join('\n')
    );
  }

  return sections.join('\n\n');
}

function fmt(n) {
  if (n == null) return 'N/A';
  if (typeof n !== 'number') n = Number(n);
  if (isNaN(n)) return 'N/A';
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(2);
}

function rd(n) {
  if (n == null) return 'N/A';
  return Number(n).toFixed(2);
}

function pct(n) {
  if (n == null) return 'N/A';
  return (Number(n) * 100).toFixed(2) + '%';
}
