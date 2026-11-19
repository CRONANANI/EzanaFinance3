/**
 * Integrated 3-statement forecast (US Equities, Valuation Models, Nov 19th,
 * 2026). Pure and deterministic: the same reported base year and the same
 * drivers always give the same statements. No React, no fetch.
 *
 * Base year: the latest annual statements from /api/research/company/:sym
 * ?part=financials (FMP, as reported). Drivers are percentages the reader can
 * edit; the defaults come from the reported history and are disclosed.
 *
 * Linkage (USD, five forecast years):
 *   Income      revenue x growth; gross profit = revenue x gross margin;
 *               EBIT = gross profit - R&D - SG&A (each a % of revenue);
 *               EBITDA = EBIT + D&A; interest = rate x opening debt;
 *               tax = rate x max(0, pre-tax); net income.
 *   Cash flow   CFO = net income + D&A - increase in net working capital;
 *               FCF = CFO - capex; no dividends, buybacks or new debt are
 *               assumed, so the change in cash equals FCF.
 *   Balance     cash rolls forward by FCF; net working capital = % of
 *               revenue; PP&E = opening + capex - D&A; debt held flat;
 *               equity = opening + net income; other assets and other
 *               liabilities held at the base-year values.
 * The balance check compares total assets with liabilities plus equity in
 * every forecast year and passes only when the gap is under BALANCE_TOLERANCE.
 *
 * A 3-statement forecast is not a valuation: it produces no per-share value.
 */

export const YEARS = 5;
export const BALANCE_TOLERANCE = 1e6; /* $1M */

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Value of `key` in a statement's line list, by period index (oldest first). */
function line(statement, key) {
  return statement?.lines?.find((l) => l.key === key)?.values || [];
}
const last = (arr) => {
  for (let i = arr.length - 1; i >= 0; i -= 1) if (isNum(arr[i])) return arr[i];
  return null;
};
const ratio = (a, b) => (isNum(a) && isNum(b) && b !== 0 ? a / b : null);

/** Average of a ratio over the reported years where both sides exist. */
function avgRatio(nums, dens, years = 3) {
  const xs = [];
  for (let i = nums.length - 1; i >= 0 && xs.length < years; i -= 1) {
    const r = ratio(nums[i], dens[i]);
    if (isNum(r)) xs.push(r);
  }
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/**
 * Base year and default drivers from reported financials.
 * Returns null when the statements are too thin to build a model.
 */
export function baseFromFinancials(fin) {
  if (!fin?.income || !fin?.balance) return null;
  const inc = fin.income;
  const bal = fin.balance;
  const cf = fin.cashflow;
  const rev = line(inc, 'revenue');
  const revenue = last(rev);
  if (!isNum(revenue) || revenue <= 0) return null;

  const cash =
    (last(line(bal, 'cashAndCashEquivalents')) || 0) +
    (last(line(bal, 'shortTermInvestments')) || 0);
  const receivables = last(line(bal, 'netReceivables')) || 0;
  const inventory = last(line(bal, 'inventory')) || 0;
  const payables = last(line(bal, 'accountPayables')) || 0;
  const ppe = last(line(bal, 'propertyPlantEquipmentNet')) || 0;
  const totalAssets = last(line(bal, 'totalAssets'));
  const totalLiabilities = last(line(bal, 'totalLiabilities'));
  const equity = last(line(bal, 'totalStockholdersEquity'));
  const debt =
    last(line(bal, 'totalDebt')) ??
    (last(line(bal, 'longTermDebt')) || 0) + (last(line(bal, 'shortTermDebt')) || 0);
  if (!isNum(totalAssets) || !isNum(equity)) return null;

  const nwc = receivables + inventory - payables;
  const otherAssets = totalAssets - cash - ppe - receivables - inventory;
  /* Everything on the funding side that is not debt or common equity
     (payables excluded, they sit in NWC; minority interest included). */
  const otherLiabilities = cash + ppe + nwc + otherAssets - debt - equity;

  /* Revenue growth: average of the last three reported years, bounded. */
  const growths = [];
  for (let i = rev.length - 1; i > 0 && growths.length < 3; i -= 1) {
    const g = ratio(rev[i], rev[i - 1]);
    if (isNum(g)) growths.push(g - 1);
  }
  const growth = growths.length ? growths.reduce((a, b) => a + b, 0) / growths.length : 0.05;

  const gp = line(inc, 'grossProfit');
  const rd = line(inc, 'researchAndDevelopmentExpenses');
  const sga = line(inc, 'sellingGeneralAndAdministrativeExpenses');
  const da = line(cf, 'depreciationAndAmortization');
  const capex = line(cf, 'capitalExpenditure').map((v) => (isNum(v) ? Math.abs(v) : v));
  const tax = line(inc, 'incomeTaxExpense');
  const pretax = line(inc, 'incomeBeforeTax');
  const interest = line(inc, 'interestExpense');

  const taxRate = avgRatio(tax, pretax);
  const drivers = {
    revenueGrowth: clamp(growth, -0.2, 0.4) * 100,
    grossMargin: clamp(avgRatio(gp, rev) ?? 0.3, -0.5, 0.95) * 100,
    rdPct: clamp(avgRatio(rd, rev) ?? 0, 0, 0.6) * 100,
    sgaPct: clamp(avgRatio(sga, rev) ?? 0.1, 0, 0.8) * 100,
    daPct: clamp(avgRatio(da, rev) ?? 0.03, 0, 0.4) * 100,
    capexPct: clamp(avgRatio(capex, rev) ?? 0.04, 0, 0.6) * 100,
    nwcPct: clamp(nwc / revenue, -0.5, 0.8) * 100,
    taxRate: clamp(isNum(taxRate) && taxRate > 0 ? taxRate : 0.21, 0, 0.45) * 100,
    interestRate:
      clamp(debt > 0 ? (ratio(Math.abs(last(interest) || 0), debt) ?? 0.05) : 0.05, 0, 0.2) * 100,
  };

  const periods = inc.periods || [];
  return {
    label: periods[periods.length - 1]?.label || 'Base year',
    revenue,
    grossProfit: last(gp),
    ebit: last(line(inc, 'operatingIncome')),
    ebitda: last(line(inc, 'ebitda')),
    netIncome: last(line(inc, 'netIncome')),
    fcf: last(line(cf, 'freeCashFlow')),
    capex: last(capex),
    cash,
    nwc,
    ppe,
    otherAssets,
    debt,
    otherLiabilities,
    equity,
    shares: last(line(inc, 'weightedAverageShsOutDil')),
    drivers,
  };
}

/** Disclosed scenario presets: base = reported history; bull/bear shift two drivers. */
export const SCENARIOS = {
  base: { label: 'Base', note: 'Drivers from the last three reported years.' },
  bull: { label: 'Bull', note: 'Base with revenue growth +3 pts and gross margin +1 pt.' },
  bear: { label: 'Bear', note: 'Base with revenue growth -3 pts and gross margin -1 pt.' },
};

export function scenarioDrivers(base, scenario) {
  const d = { ...base.drivers };
  if (scenario === 'bull') {
    d.revenueGrowth += 3;
    d.grossMargin += 1;
  } else if (scenario === 'bear') {
    d.revenueGrowth -= 3;
    d.grossMargin -= 1;
  }
  return d;
}

/**
 * Run the model. `drivers` are percents (10 = 10%).
 * Returns { years: [...], balance: { pass, maxGap }, summary }.
 */
export function runThreeStatement(base, drivers) {
  const p = (k) => (isNum(drivers[k]) ? drivers[k] / 100 : 0);
  const years = [];
  let prev = {
    revenue: base.revenue,
    cash: base.cash,
    nwc: base.nwc,
    ppe: base.ppe,
    debt: base.debt,
    equity: base.equity,
  };
  let maxGap = 0;
  for (let i = 1; i <= YEARS; i += 1) {
    const revenue = prev.revenue * (1 + p('revenueGrowth'));
    const grossProfit = revenue * p('grossMargin');
    const rd = revenue * p('rdPct');
    const sga = revenue * p('sgaPct');
    const ebit = grossProfit - rd - sga;
    const da = revenue * p('daPct');
    const ebitda = ebit + da;
    const interest = prev.debt * p('interestRate');
    const pretax = ebit - interest;
    const tax = Math.max(0, pretax) * p('taxRate');
    const netIncome = pretax - tax;

    const nwc = revenue * p('nwcPct');
    const dNwc = nwc - prev.nwc;
    const capex = revenue * p('capexPct');
    const cfo = netIncome + da - dNwc;
    const fcf = cfo - capex;

    const cash = prev.cash + fcf;
    const ppe = prev.ppe + capex - da;
    const debt = prev.debt;
    const equity = prev.equity + netIncome;
    const totalAssets = cash + nwc + ppe + base.otherAssets;
    const totalFunding = debt + base.otherLiabilities + equity;
    const gap = totalAssets - totalFunding;
    maxGap = Math.max(maxGap, Math.abs(gap));

    const row = {
      label: `Year ${i}`,
      revenue,
      revenueGrowth: revenue / prev.revenue - 1,
      grossProfit,
      grossMargin: grossProfit / revenue,
      rd,
      sga,
      ebit,
      ebitMargin: ebit / revenue,
      da,
      ebitda,
      ebitdaMargin: ebitda / revenue,
      interest,
      pretax,
      tax,
      netIncome,
      eps: isNum(base.shares) && base.shares > 0 ? netIncome / base.shares : null,
      cfo,
      dNwc,
      capex,
      fcf,
      fcfMargin: fcf / revenue,
      cash,
      nwc,
      ppe,
      otherAssets: base.otherAssets,
      totalAssets,
      debt,
      otherLiabilities: base.otherLiabilities,
      equity,
      totalFunding,
      netDebt: debt - cash,
      gap,
    };
    years.push(row);
    prev = { revenue, cash, nwc, ppe, debt, equity };
  }
  const y5 = years[YEARS - 1];
  return {
    years,
    balance: { pass: maxGap < BALANCE_TOLERANCE, maxGap },
    summary: {
      revenueCagr: Math.pow(y5.revenue / base.revenue, 1 / YEARS) - 1,
      y5Revenue: y5.revenue,
      y5EbitdaMargin: y5.ebitdaMargin,
      y5FcfMargin: y5.fcfMargin,
      y5NetDebtToEbitda: y5.ebitda > 0 ? y5.netDebt / y5.ebitda : null,
      y5Fcf: y5.fcf,
    },
  };
}

/** Year-5 FCF over a grid of revenue growth x gross margin (both in points around the drivers). */
export function fcfSensitivity(base, drivers, steps = [-2, 0, 2]) {
  return steps.map((dg) => ({
    growth: drivers.revenueGrowth + dg,
    cells: steps.map((dm) => {
      const out = runThreeStatement(base, {
        ...drivers,
        revenueGrowth: drivers.revenueGrowth + dg,
        grossMargin: drivers.grossMargin + dm,
      });
      return { margin: drivers.grossMargin + dm, fcf: out.years[YEARS - 1].fcf };
    }),
  }));
}
