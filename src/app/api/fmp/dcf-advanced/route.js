import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const BASE = 'https://financialmodelingprep.com/stable/custom-discounted-cash-flow';

/**
 * FMP's custom DCF endpoint expects mixed unit conventions:
 *   - Most percentage fields are decimals (e.g. revenueGrowthPct = 0.10 for 10%)
 *   - But longTermGrowthRate, costOfDebt, costOfEquity, marketRiskPremium,
 *     riskFreeRate, beta are raw percentage numbers (e.g. 4 for 4%, 1.244 for beta)
 * The client always sends decimals; this function converts where needed.
 */
function buildFmpQuery(symbol, assumptions) {
  const params = new URLSearchParams({ symbol, apikey: FMP_KEY });

  // Decimal fields — pass through as-is
  const decimalFields = [
    'revenueGrowthPct',
    'ebitPct',
    'depreciationAndAmortizationPct',
    'capitalExpenditurePct',
    'taxRate',
  ];
  for (const f of decimalFields) {
    if (assumptions[f] != null && Number.isFinite(assumptions[f])) {
      params.set(f, String(assumptions[f]));
    }
  }

  if (assumptions.workingCapitalPct != null) {
    const w = assumptions.workingCapitalPct;
    params.set('receivablesPct', String(w * 0.6));
    params.set('inventoriesPct', String(w * 0.1));
    params.set('payablePct', String(w * 0.5));
  }

  const percentFields = {
    longTermGrowthRate: true,
    costOfDebt: true,
    costOfEquity: true,
    marketRiskPremium: true,
    riskFreeRate: true,
  };
  for (const f of Object.keys(percentFields)) {
    if (assumptions[f] != null && Number.isFinite(assumptions[f])) {
      const v = assumptions[f] < 1 ? assumptions[f] * 100 : assumptions[f];
      params.set(f, String(Number(v.toFixed(4))));
    }
  }

  if (assumptions.beta != null && Number.isFinite(assumptions.beta)) {
    params.set('beta', String(assumptions.beta));
  }

  return params;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || '').toUpperCase().trim();

  if (!symbol) {
    return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  }
  if (!FMP_KEY) {
    return NextResponse.json({ error: 'FMP_API_KEY not configured' }, { status: 503 });
  }

  const assumptionFields = [
    'revenueGrowthPct',
    'ebitPct',
    'depreciationAndAmortizationPct',
    'capitalExpenditurePct',
    'taxRate',
    'workingCapitalPct',
    'longTermGrowthRate',
    'costOfDebt',
    'costOfEquity',
    'marketRiskPremium',
    'riskFreeRate',
    'beta',
  ];
  const assumptions = {};
  for (const f of assumptionFields) {
    const raw = searchParams.get(f);
    if (raw != null && raw !== '') {
      const n = Number(raw);
      if (Number.isFinite(n)) assumptions[f] = n;
    }
  }

  const fmpParams = buildFmpQuery(symbol, assumptions);
  const url = `${BASE}?${fmpParams.toString()}`;
  const urlForLog = url.replace(FMP_KEY, '***');

  try {
    console.log('[fmp/dcf-advanced] upstream:', urlForLog);
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      let body = '';
      try {
        body = await res.text();
      } catch {
        /* ignore */
      }
      console.error(`[fmp/dcf-advanced] FMP HTTP ${res.status}:`, body.slice(0, 500));
      return NextResponse.json(
        {
          error: `FMP HTTP ${res.status}`,
          detail: body.slice(0, 200),
        },
        { status: 200 }
      );
    }

    const data = await res.json();
    let projections = [];
    if (Array.isArray(data)) {
      projections = data;
    } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
      projections = data.data;
    }

    if (projections.length === 0) {
      return NextResponse.json({ error: 'no projections returned', projections: [] }, { status: 200 });
    }

    const final = projections[projections.length - 1];
    const headline = {
      symbol: final.symbol,
      finalYear: final.year,
      equityValuePerShare: final.equityValuePerShare ?? null,
      enterpriseValue: final.enterpriseValue ?? null,
      equityValue: final.equityValue ?? null,
      wacc: final.wacc ?? null,
      terminalValue: final.terminalValue ?? null,
      presentTerminalValue: final.presentTerminalValue ?? null,
      netDebt: final.netDebt ?? null,
      dilutedSharesOutstanding: final.dilutedSharesOutstanding ?? null,
      baselineAssumptions: {
        beta: final.beta,
        costOfDebt: final.costOfDebt ?? final.costofDebt,
        costOfEquity: final.costOfEquity ?? final.costOfEquity,
        riskFreeRate: final.riskFreeRate,
        marketRiskPremium: final.marketRiskPremium,
        taxRate: final.taxRate,
        longTermGrowthRate: final.longTermGrowthRate,
      },
    };

    return NextResponse.json({ projections, headline });
  } catch (err) {
    console.error('[fmp/dcf-advanced] threw:', err?.message);
    return NextResponse.json({ error: err?.message || 'unknown error' }, { status: 200 });
  }
}
