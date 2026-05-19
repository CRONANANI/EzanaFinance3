import { fetchAV, getAlphaVantageApiKey } from '@/lib/alpha-vantage';

const FMP_BASE = 'https://financialmodelingprep.com/stable';
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

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
  if (cache.size > 200) cache.delete(cache.keys().next().value);
}

/**
 * Fetch from FMP stable API. Returns null on any failure — never throws.
 */
async function fmpFetch(path) {
  const apiKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
  if (!apiKey) return null;

  const cacheKey = `fmp:${path}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${FMP_BASE}/${path}${sep}apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[ai/market-data] FMP ${res.status} for ${path}`);
      return null;
    }
    const data = await res.json();
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.warn(`[ai/market-data] FMP fetch failed for ${path}:`, err?.message);
    return null;
  }
}

/**
 * Fetch from Alpha Vantage. Returns null on any failure — never throws.
 */
async function avFetch(params) {
  if (!getAlphaVantageApiKey()) return null;
  try {
    return await fetchAV(params, 300);
  } catch (err) {
    console.warn(`[ai/market-data] AV fetch failed for ${params.function}:`, err?.message);
    return null;
  }
}

function first(data) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data && typeof data === 'object' ? data : null;
}

/**
 * Fetch market data from FMP (stable API) + Alpha Vantage fallback.
 * Each endpoint is individually wrapped — a failure in one never crashes the others.
 */
export async function fetchMarketData(ticker) {
  const symbol = ticker.toUpperCase().trim();

  const [quote, profile, ratios, income, earnings] = await Promise.all([
    fmpFetch(`quote?symbol=${symbol}`),
    fmpFetch(`profile?symbol=${symbol}`),
    fmpFetch(`ratios-ttm?symbol=${symbol}`),
    fmpFetch(`income-statement?symbol=${symbol}&period=quarter&limit=4`),
    fmpFetch(`earnings-surprises?symbol=${symbol}&limit=4`),
  ]);

  const [estimates, insider] = await Promise.all([
    fmpFetch(`analyst-estimates?symbol=${symbol}&limit=1`),
    fmpFetch(`insider-trading?symbol=${symbol}&limit=10`),
  ]);

  let avOverview = null;
  let avIncome = null;
  let avBalanceSheet = null;
  let avCashFlow = null;
  let avEarnings = null;

  const needsAv = !first(quote) || !first(profile) || !first(ratios);
  if (needsAv) {
    [avOverview, avIncome, avBalanceSheet, avCashFlow, avEarnings] = await Promise.all([
      avFetch({ function: 'OVERVIEW', symbol }),
      avFetch({ function: 'INCOME_STATEMENT', symbol }),
      avFetch({ function: 'BALANCE_SHEET', symbol }),
      avFetch({ function: 'CASH_FLOW', symbol }),
      avFetch({ function: 'EARNINGS', symbol }),
    ]);
  }

  return {
    ticker: symbol,
    fetchedAt: new Date().toISOString(),
    quote: first(quote) ?? null,
    profile: first(profile) ?? null,
    ratios: first(ratios) ?? null,
    incomeStatements: Array.isArray(income) ? income : [],
    analystEstimates: first(estimates) ?? null,
    insiderTrades: Array.isArray(insider) ? insider.slice(0, 10) : [],
    earningsSurprises: Array.isArray(earnings) ? earnings.slice(0, 4) : [],
    avOverview: avOverview ?? null,
    avIncome: avIncome?.quarterlyReports?.slice(0, 4) ?? [],
    avBalanceSheet: avBalanceSheet?.quarterlyReports?.slice(0, 4) ?? [],
    avCashFlow: avCashFlow?.quarterlyReports?.slice(0, 4) ?? [],
    avEarnings: avEarnings?.quarterlyEarnings?.slice(0, 4) ?? [],
  };
}

export function formatMarketDataForPrompt(data) {
  if (!data) return 'No market data available.';

  const sections = [];

  const p = data.profile || data.avOverview;
  if (p) {
    sections.push(
      `## Company Profile\n` +
        `Name: ${p.companyName || p.Name || data.ticker}\n` +
        `Sector: ${p.sector || p.Sector || 'N/A'}\n` +
        `Industry: ${p.industry || p.Industry || 'N/A'}\n` +
        `Market Cap: $${fmt(p.mktCap || p.MarketCapitalization)}\n` +
        `Employees: ${(p.fullTimeEmployees || p.FullTimeEmployees || 'N/A').toLocaleString()}\n` +
        `Description: ${(p.description || p.Description || '').slice(0, 300)}…`,
    );
  }

  if (data.quote) {
    const q = data.quote;
    sections.push(
      `## Current Quote\n` +
        `Price: $${q.price}\nChange: ${q.change} (${q.changesPercentage}%)\n` +
        `Day Range: $${q.dayLow} – $${q.dayHigh}\n52-Week Range: $${q.yearLow} – $${q.yearHigh}\n` +
        `Volume: ${fmt(q.volume)}\nMarket Cap: $${fmt(q.marketCap)}\nP/E: ${q.pe ?? 'N/A'}\nEPS: ${q.eps ?? 'N/A'}`,
    );
  } else if (data.avOverview) {
    const o = data.avOverview;
    sections.push(
      `## Current Data (from Alpha Vantage)\n` +
        `P/E: ${o.PERatio || 'N/A'}\nEPS: ${o.EPS || 'N/A'}\nDividend Yield: ${o.DividendYield || 'N/A'}\n` +
        `52-Week High: $${o['52WeekHigh'] || 'N/A'}\n52-Week Low: $${o['52WeekLow'] || 'N/A'}\n` +
        `Beta: ${o.Beta || 'N/A'}\nProfit Margin: ${o.ProfitMargin || 'N/A'}\nROE: ${o.ReturnOnEquityTTM || 'N/A'}`,
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
        `Dividend Yield: ${pct(r.dividendYieldTTM)}`,
    );
  }

  const incomeData = data.incomeStatements?.length ? data.incomeStatements : data.avIncome;
  if (incomeData?.length) {
    const isFmp = data.incomeStatements?.length > 0;
    sections.push(
      `## Income Statements (Last ${incomeData.length} Quarters)\n` +
        incomeData
          .map((s) => {
            if (isFmp) {
              return `${s.period} ${s.calendarYear}: Revenue $${fmt(s.revenue)} | Gross Profit $${fmt(s.grossProfit)} | Net Income $${fmt(s.netIncome)} | EPS $${s.eps}`;
            }
            return `${s.fiscalDateEnding}: Revenue $${fmt(s.totalRevenue)} | Gross Profit $${fmt(s.grossProfit)} | Net Income $${fmt(s.netIncome)} | EPS $${s.reportedEPS || 'N/A'}`;
          })
          .join('\n'),
    );
  }

  if (data.avBalanceSheet?.length) {
    sections.push(
      `## Balance Sheet (Last ${data.avBalanceSheet.length} Quarters)\n` +
        data.avBalanceSheet
          .map(
            (s) =>
              `${s.fiscalDateEnding}: Total Assets $${fmt(s.totalAssets)} | Total Liabilities $${fmt(s.totalLiabilities)} | Equity $${fmt(s.totalShareholderEquity)} | Cash $${fmt(s.cashAndShortTermInvestments)} | Debt $${fmt(s.longTermDebt)}`,
          )
          .join('\n'),
    );
  }

  if (data.avCashFlow?.length) {
    sections.push(
      `## Cash Flow Statement (Last ${data.avCashFlow.length} Quarters)\n` +
        data.avCashFlow
          .map(
            (s) =>
              `${s.fiscalDateEnding}: Operating CF $${fmt(s.operatingCashflow)} | CapEx $${fmt(s.capitalExpenditures)} | FCF $${fmt(Number(s.operatingCashflow || 0) - Math.abs(Number(s.capitalExpenditures || 0)))} | Dividends $${fmt(s.dividendPayout)}`,
          )
          .join('\n'),
    );
  }

  const earningsData = data.earningsSurprises?.length ? data.earningsSurprises : data.avEarnings;
  if (earningsData?.length) {
    const isFmp = data.earningsSurprises?.length > 0;
    sections.push(
      `## Earnings Surprises (Last ${earningsData.length} Quarters)\n` +
        earningsData
          .map((e) => {
            if (isFmp) {
              return `${e.date}: Actual $${e.actualEarningResult} vs Est $${e.estimatedEarning} (${Number(e.actualEarningResult) > Number(e.estimatedEarning) ? 'BEAT' : 'MISS'})`;
            }
            return `${e.fiscalDateEnding}: Actual $${e.reportedEPS} vs Est $${e.estimatedEPS} (${Number(e.reportedEPS) > Number(e.estimatedEPS) ? 'BEAT' : 'MISS'})`;
          })
          .join('\n'),
    );
  }

  if (data.analystEstimates) {
    const a = data.analystEstimates;
    sections.push(
      `## Analyst Estimates\n` +
        `Est. Revenue: $${fmt(a.estimatedRevenueAvg)}\nEst. EPS: $${a.estimatedEpsAvg}\n` +
        `Number of Analysts: ${a.numberAnalystEstimatedRevenue ?? 'N/A'}`,
    );
  }

  if (data.insiderTrades?.length) {
    const buys = data.insiderTrades.filter((t) => t.acquistionOrDisposition === 'A');
    const sells = data.insiderTrades.filter((t) => t.acquistionOrDisposition === 'D');
    sections.push(
      `## Insider Trading (Recent)\n` +
        `Buys: ${buys.length} | Sells: ${sells.length}\n` +
        data.insiderTrades
          .slice(0, 6)
          .map(
            (t) =>
              `${t.transactionDate}: ${t.reportingName} — ${t.acquistionOrDisposition === 'A' ? 'BUY' : 'SELL'} ${fmt(t.securitiesTransacted)} shares at $${t.price}`,
          )
          .join('\n'),
    );
  }

  if (sections.length === 0)
    return 'Market data unavailable — provide analysis based on your knowledge.';
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
  return n == null ? 'N/A' : Number(n).toFixed(2);
}
function pct(n) {
  return n == null ? 'N/A' : (Number(n) * 100).toFixed(2) + '%';
}
