/**
 * The deep research valuation model (Nov 2026): historical multiples, comparable companies,
 * a discounted cash flow, scenarios, sensitivity and a conclusion that keeps observations,
 * model outputs and interpretation apart. Pure: every input comes in, every assumption goes
 * out with the result. Tested in scripts/check-sonar-valuation.mjs.
 *
 * The DCF is a model, not a fact. It runs only when every input it needs is present (revenue,
 * operating income, tax, D&A, capex, diluted shares, beta, a risk-free rate); otherwise it
 * says which inputs are missing and stops. Each assumption carries its source: "reported"
 * (from filings), "market" (beta, the Treasury yield, consensus), or "assumption" (a stated
 * convention such as the equity risk premium), so the reader sees what is data and what is
 * chosen.
 *
 * Free cash flow to the firm, per forecast year:
 *   revenue_t     = revenue_{t-1} x (1 + g_t), g fading linearly from the starting growth to
 *                   the terminal growth over the forecast
 *   EBIT_t        = revenue_t x operating margin
 *   NOPAT_t       = EBIT_t x (1 - tax rate)
 *   reinvestment  = (capex - D&A) as a share of revenue + working capital as a share of the
 *                   change in revenue
 *   FCFF_t        = NOPAT_t + D&A_t - capex_t - change in working capital_t
 * Discount rate: WACC = E/(D+E) x (rf + beta x ERP) + D/(D+E) x cost of debt x (1 - tax).
 * Terminal value: Gordon growth on the year after the forecast, FCFF_{n+1} / (WACC - g).
 * Equity value = enterprise value - debt + cash (- minority interest); per share on diluted
 * shares.
 */
import { quantile, percentileRank } from './history';

export const MODEL_VERSION = 'valuation-model-v1';
export const FORECAST_YEARS = 5;
export const ASSUMPTIONS = {
  equityRiskPremium: 0.05,
  terminalGrowth: 0.025,
  defaultTaxRate: 0.21,
  minSpread: 0.01,
};

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const pct = (v) => +(v * 100).toFixed(2);

/**
 * The DCF inputs from the valuation history and market data.
 * market: { beta, riskFree (decimal), price }, consensus: { revenueGrowthNextFy (decimal) }
 * -> { ok, missing: string[], inputs }
 */
export function dcfInputs(history, { beta = null, riskFree = null, consensusGrowth = null } = {}) {
  const t = history?.ttm || {};
  const c = history?.current || {};
  const missing = [];
  const need = (v, name) => {
    if (num(v) == null) missing.push(name);
    return num(v);
  };
  const revenue = need(t.revenue, 'trailing revenue');
  const ebit = need(t.operatingIncome, 'trailing operating income');
  const da = need(t.da, 'depreciation and amortization');
  const capex = need(t.capex, 'capital expenditure');
  const shares = need(c.sharesDiluted, 'diluted shares');
  const b = need(beta, 'beta');
  const rf = need(riskFree, 'risk-free rate');
  const debt = need(c.debt, 'total debt');
  const cash = need(c.cash, 'cash and short-term investments');
  if (revenue != null && revenue <= 0) missing.push('positive revenue');
  if (ebit != null && ebit <= 0) missing.push('positive operating income');
  if (missing.length) return { ok: false, missing, inputs: null };

  const taxRate =
    num(t.incomeTax) != null && num(t.incomeBeforeTax) > 0
      ? clamp(t.incomeTax / t.incomeBeforeTax, 0.05, 0.35)
      : ASSUMPTIONS.defaultTaxRate;
  const taxSource =
    num(t.incomeTax) != null && num(t.incomeBeforeTax) > 0 ? 'reported' : 'assumption';
  const costOfDebt =
    num(t.interestExpense) != null && debt > 0
      ? clamp(Math.abs(t.interestExpense) / debt, 0.02, 0.12)
      : rf + 0.01;
  const hist = history.growth?.revenueCagr3yPct ?? history.growth?.revenueYoyPct;
  const startGrowth =
    num(consensusGrowth) != null
      ? clamp(consensusGrowth, -0.1, 0.3)
      : num(hist) != null
        ? clamp(hist / 100, -0.1, 0.25)
        : ASSUMPTIONS.terminalGrowth;
  const growthSource =
    num(consensusGrowth) != null ? 'market' : num(hist) != null ? 'reported' : 'assumption';
  const marketCap = num(c.marketCap);
  return {
    ok: true,
    missing: [],
    inputs: {
      revenue,
      margin: ebit / revenue,
      taxRate,
      taxSource,
      daPct: da / revenue,
      capexPct: capex / revenue,
      /* Working capital: the trailing change against the trailing change in revenue is noisy,
         so the model holds it at 2% of the change in revenue, a stated convention. */
      wcPct: 0.02,
      startGrowth,
      growthSource,
      terminalGrowth: ASSUMPTIONS.terminalGrowth,
      beta: b,
      riskFree: rf,
      erp: ASSUMPTIONS.equityRiskPremium,
      costOfDebt,
      debt,
      cash,
      minority: num(c.minority) || 0,
      shares,
      marketCap,
      price: num(c.price),
    },
  };
}

/** WACC from the inputs (decimal). */
export function wacc(i) {
  const ke = i.riskFree + i.beta * i.erp;
  const E = i.marketCap > 0 ? i.marketCap : null;
  const D = i.debt;
  if (!E) return ke;
  return (E / (E + D)) * ke + (D / (E + D)) * i.costOfDebt * (1 - i.taxRate);
}

/**
 * Run the DCF on a set of inputs (any field can be overridden for a scenario).
 * -> { years: [...], wacc, terminalGrowth, terminalValue, pvTerminal, enterpriseValue,
 *      equityValue, perShare, terminalShare } | { error }
 */
export function runDcf(i, over = {}) {
  const x = { ...i, ...over };
  const r = num(over.wacc) ?? wacc(x);
  const g = x.terminalGrowth;
  if (r - g < ASSUMPTIONS.minSpread)
    return {
      error: `The discount rate (${pct(r)}%) is too close to terminal growth (${pct(g)}%).`,
    };
  const years = [];
  let rev = x.revenue;
  let pv = 0;
  for (let t = 1; t <= FORECAST_YEARS; t += 1) {
    const growth = x.startGrowth + ((g - x.startGrowth) * (t - 1)) / (FORECAST_YEARS - 1);
    const prev = rev;
    rev = prev * (1 + growth);
    const ebit = rev * x.margin;
    const nopat = ebit * (1 - x.taxRate);
    const da = rev * x.daPct;
    const capex = rev * x.capexPct;
    const dwc = (rev - prev) * x.wcPct;
    const fcff = nopat + da - capex - dwc;
    const df = 1 / (1 + r) ** t;
    pv += fcff * df;
    years.push({ year: t, growth, revenue: rev, ebit, nopat, da, capex, dwc, fcff, pv: fcff * df });
  }
  const last = years.at(-1);
  const nextRev = last.revenue * (1 + g);
  const nextFcff =
    nextRev * x.margin * (1 - x.taxRate) +
    nextRev * x.daPct -
    nextRev * x.capexPct -
    (nextRev - last.revenue) * x.wcPct;
  const tv = nextFcff / (r - g);
  const pvTv = tv / (1 + r) ** FORECAST_YEARS;
  const ev = pv + pvTv;
  const equity = ev - x.debt + x.cash - (x.minority || 0);
  return {
    years,
    wacc: r,
    terminalGrowth: g,
    terminalValue: tv,
    pvTerminal: pvTv,
    pvForecast: pv,
    enterpriseValue: ev,
    equityValue: equity,
    perShare: x.shares > 0 ? equity / x.shares : null,
    terminalShare: ev > 0 ? pvTv / ev : null,
  };
}

/** Bear, base and bull: growth, margin and discount rate moved together, each change stated. */
export const SCENARIO_SHIFTS = {
  bear: { growth: -0.03, margin: -0.02, wacc: 0.01, label: 'Bear' },
  base: { growth: 0, margin: 0, wacc: 0, label: 'Base' },
  bull: { growth: 0.03, margin: 0.02, wacc: -0.005, label: 'Bull' },
};

export function scenarios(i) {
  const baseWacc = wacc(i);
  return Object.entries(SCENARIO_SHIFTS).map(([id, s]) => {
    const over = {
      startGrowth: i.startGrowth + s.growth,
      margin: Math.max(0.01, i.margin + s.margin),
      wacc: baseWacc + s.wacc,
    };
    const out = runDcf(i, over);
    return {
      id,
      label: s.label,
      assumptions: {
        startGrowthPct: pct(over.startGrowth),
        marginPct: pct(over.margin),
        waccPct: pct(over.wacc),
        terminalGrowthPct: pct(i.terminalGrowth),
      },
      changes: s,
      perShare: out.error ? null : out.perShare,
      vsPricePct:
        !out.error && i.price > 0 && out.perShare != null
          ? (out.perShare / i.price - 1) * 100
          : null,
      error: out.error || null,
    };
  });
}

/** Per-share value across WACC (rows) and terminal growth (columns). */
export function sensitivityWaccGrowth(
  i,
  { waccStep = 0.005, growths = [0.015, 0.02, 0.025, 0.03, 0.035] } = {},
) {
  const base = wacc(i);
  const waccs = [-2, -1, 0, 1, 2].map((k) => base + k * waccStep);
  return {
    rows: waccs.map((w) => pct(w)),
    cols: growths.map((g) => pct(g)),
    cells: waccs.map((w) =>
      growths.map((g) => {
        const out = runDcf(i, { wacc: w, terminalGrowth: g });
        return out.error ? null : out.perShare;
      }),
    ),
  };
}

/**
 * Price in a year across earnings growth (rows) and the P/E multiple (columns): consensus
 * forward EPS x (1 + growth surprise) x a multiple from the stock's own P/E history (25th
 * percentile, median, 75th percentile). Null when either input is missing.
 */
export function sensitivityGrowthMultiple(history) {
  const fwd = history?.current?.forwardEps;
  const pe = (history?.metrics || []).find((m) => m.id === 'pe_ttm');
  if (!fwd || !(fwd.eps > 0) || !pe?.series?.length || pe.observations < 24) return null;
  const sample = pe.series.map((s) => s.value);
  const multiples = [
    { label: '25th percentile', value: quantile(sample, 0.25) },
    { label: 'Median', value: quantile(sample, 0.5) },
    { label: '75th percentile', value: quantile(sample, 0.75) },
  ];
  const surprises = [-0.1, 0, 0.1];
  return {
    eps: fwd.eps,
    fiscalYearEnd: fwd.date,
    rows: surprises.map((s) => ({
      label: s === 0 ? 'Consensus EPS' : `EPS ${s > 0 ? '+' : ''}${s * 100}% vs consensus`,
      surprise: s,
    })),
    cols: multiples,
    cells: surprises.map((s) => multiples.map((m) => fwd.eps * (1 + s) * m.value)),
  };
}

/**
 * Comparable companies: the subject against its industry peers on the same TTM measures. The
 * subject's position is a peer percentile (never mixed with its historical percentile).
 * peers: [{ ticker, name, marketCap, pe, evEbitda, ps, fcfYield, revenueGrowth, operatingMargin }]
 */
export function peerComparison(subject, peers = [], logic = null) {
  const rows = (peers || []).filter((p) => p && p.ticker);
  if (!rows.length) return { rows: [], medians: {}, subjectPercentile: {}, logic };
  const keys = ['pe', 'evEbitda', 'ps', 'fcfYield', 'revenueGrowth', 'operatingMargin'];
  const medians = {};
  const subjectPercentile = {};
  for (const k of keys) {
    const xs = rows
      .map((r) => r[k])
      .filter(
        (v) =>
          num(v) != null &&
          (k === 'fcfYield' || k === 'revenueGrowth' || k === 'operatingMargin' || v > 0),
      );
    medians[k] = xs.length ? quantile(xs, 0.5) : null;
    subjectPercentile[k] =
      num(subject?.[k]) != null ? percentileRank(xs, subject[k], { min: 3 }) : null;
  }
  const scale = rows
    .map((r) =>
      num(r.marketCap) && num(subject?.marketCap) ? subject.marketCap / r.marketCap : null,
    )
    .filter((v) => v != null);
  return {
    subject,
    rows,
    medians,
    subjectPercentile,
    percentileKind: 'peer',
    logic: logic
      ? {
          ...logic,
          scaleNote:
            scale.length && Math.max(...scale) >= 10
              ? `The subject is ${Math.round(Math.max(...scale))}x the market cap of the smallest peer; scale differences limit how far peer multiples carry over.`
              : null,
        }
      : null,
  };
}

const fx = (v, d = 1) => (num(v) == null ? 'n/a' : Number(v).toFixed(d));
const ord = (p) => {
  const n = Math.round(p);
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return `${n}${s}`;
};

/**
 * The conclusion, as labelled statements: observation (measured), model (a DCF or scenario
 * output under its assumptions), interpretation (what it may imply, qualified), risk.
 */
export function valuationConclusion({ history, peers, dcf, scen, inputs }) {
  const out = [];
  const pe = history?.metrics?.find((m) => m.id === 'pe_ttm');
  const ev = history?.metrics?.find((m) => m.id === 'ev_ebitda');
  const fcf = history?.metrics?.find((m) => m.id === 'fcf_yield');
  const lead = [pe, ev].find((m) => m && m.percentile != null);
  if (lead)
    out.push({
      kind: 'observation',
      text: `${lead.label} of ${fx(lead.value)}x sits at the ${ord(lead.percentile)} percentile of its ${history.lookbackYears}-year month-end history (median ${fx(lead.median)}x, ${lead.observations} observations).`,
    });
  if (fcf && fcf.percentile != null)
    out.push({
      kind: 'observation',
      text: `The FCF yield of ${fx(fcf.value, 2)}% is at the ${ord(fcf.percentile)} percentile of its history; on yield, a higher percentile means a lower valuation.`,
    });
  if (peers?.rows?.length && num(peers.medians?.pe) != null && num(peers.subject?.pe) != null)
    out.push({
      kind: 'observation',
      text: `Against ${peers.rows.length} industry peers, the trailing P/E of ${fx(peers.subject.pe)}x compares with a peer median of ${fx(peers.medians.pe)}x${peers.subjectPercentile?.pe != null ? ` (peer percentile ${ord(peers.subjectPercentile.pe)})` : ''}.`,
    });
  if (dcf && !dcf.error && inputs?.price > 0 && dcf.perShare != null) {
    const gap = (dcf.perShare / inputs.price - 1) * 100;
    out.push({
      kind: 'model',
      text: `The base DCF gives $${fx(dcf.perShare, 2)} per share against a price of $${fx(inputs.price, 2)} (${gap >= 0 ? '+' : ''}${fx(gap)}%), with a WACC of ${fx(dcf.wacc * 100, 2)}% and terminal growth of ${fx(dcf.terminalGrowth * 100, 1)}%; the terminal value is ${fx((dcf.terminalShare || 0) * 100, 0)}% of enterprise value.`,
    });
    const vals = (scen || []).map((s) => s.perShare).filter((v) => num(v) != null);
    if (vals.length >= 2)
      out.push({
        kind: 'model',
        text: `Across the bear, base and bull scenarios the value runs from $${fx(Math.min(...vals), 2)} to $${fx(Math.max(...vals), 2)} per share.`,
      });
    out.push({
      kind: 'interpretation',
      text:
        gap < -10
          ? "At the current price the market appears to assume more growth, higher margins or a lower discount rate than the base case. That is a statement about the model's assumptions, not a forecast."
          : gap > 10
            ? "The base case values the business above the current price, which would mean the market assumes less growth or a higher discount rate than the model. That is a statement about the model's assumptions, not a forecast."
            : "The current price sits close to the base case, so the market's implied assumptions are near the model's.",
    });
    out.push({
      kind: 'risk',
      text: `The value is most sensitive to the discount rate and terminal growth: the terminal value carries most of it, so a small change in either moves the result a lot (see the sensitivity table).`,
    });
  } else if (dcf?.error || dcf?.missing) {
    out.push({
      kind: 'risk',
      text: dcf.error || `No DCF: ${dcf.missing.join(', ')} not available.`,
    });
  }
  return out;
}

/**
 * The whole deep valuation section from its inputs.
 * @param {{ history, market: { beta, riskFree }, consensusGrowth, peers, peerLogic, subjectTtm }} x
 */
export function buildValuationModel({
  history,
  market = {},
  consensusGrowth = null,
  peers = [],
  peerLogic = null,
  subject = null,
}) {
  if (!history) return null;
  const di = dcfInputs(history, { beta: market.beta, riskFree: market.riskFree, consensusGrowth });
  const dcf = di.ok ? runDcf(di.inputs) : { missing: di.missing };
  const scen = di.ok && !dcf.error ? scenarios(di.inputs) : [];
  const sens = di.ok && !dcf.error ? sensitivityWaccGrowth(di.inputs) : null;
  const sens2 = sensitivityGrowthMultiple(history);
  const comp = peerComparison(subject, peers, peerLogic);
  const assumptions = di.ok
    ? [
        {
          label: 'Starting revenue growth',
          value: `${pct(di.inputs.startGrowth)}%`,
          source: di.inputs.growthSource,
          note: 'fades linearly to terminal growth by year 5',
        },
        {
          label: 'Operating margin',
          value: `${pct(di.inputs.margin)}%`,
          source: 'reported',
          note: 'trailing four quarters, held flat',
        },
        {
          label: 'Tax rate',
          value: `${pct(di.inputs.taxRate)}%`,
          source: di.inputs.taxSource,
          note:
            di.inputs.taxSource === 'reported'
              ? 'trailing effective rate, bounded 5% to 35%'
              : 'US statutory rate',
        },
        {
          label: 'D&A',
          value: `${pct(di.inputs.daPct)}% of revenue`,
          source: 'reported',
          note: 'trailing four quarters',
        },
        {
          label: 'Capital expenditure',
          value: `${pct(di.inputs.capexPct)}% of revenue`,
          source: 'reported',
          note: 'trailing four quarters',
        },
        {
          label: 'Working capital',
          value: `${pct(di.inputs.wcPct)}% of the change in revenue`,
          source: 'assumption',
          note: 'a stated convention',
        },
        {
          label: 'Risk-free rate',
          value: `${pct(di.inputs.riskFree)}%`,
          source: 'market',
          note: '10-year US Treasury yield',
        },
        { label: 'Beta', value: fx(di.inputs.beta, 2), source: 'market', note: 'provider beta' },
        {
          label: 'Equity risk premium',
          value: `${pct(di.inputs.erp)}%`,
          source: 'assumption',
          note: 'a stated convention',
        },
        {
          label: 'Cost of debt',
          value: `${pct(di.inputs.costOfDebt)}%`,
          source: 'reported',
          note: 'trailing interest expense / total debt',
        },
        {
          label: 'WACC',
          value: dcf.error ? 'n/a' : `${pct(dcf.wacc)}%`,
          source: 'model',
          note: 'market-value weights',
        },
        {
          label: 'Terminal growth',
          value: `${pct(di.inputs.terminalGrowth)}%`,
          source: 'assumption',
          note: 'a stated convention',
        },
      ]
    : [];
  return {
    version: MODEL_VERSION,
    asOf: history.asOf,
    history: {
      lookbackYears: history.lookbackYears,
      metrics: history.metrics.map(({ series, ...m }) => ({
        ...m,
        series: (series || []).map((s) => ({ x: s.date, y: s.value })),
      })),
      coverage: history.coverage,
    },
    peers: comp,
    dcf: di.ok
      ? {
          ok: !dcf.error,
          error: dcf.error || null,
          inputs: di.inputs,
          assumptions,
          result: dcf.error ? null : dcf,
        }
      : { ok: false, missing: di.missing, assumptions: [] },
    scenarios: scen,
    sensitivity: { waccGrowth: sens, growthMultiple: sens2 },
    conclusion: valuationConclusion({
      history,
      peers: comp,
      dcf: di.ok ? dcf : { missing: di.missing },
      scen,
      inputs: di.inputs,
    }),
  };
}
