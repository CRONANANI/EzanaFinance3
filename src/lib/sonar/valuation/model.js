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
 *   capex_t       = revenue_t x capex intensity_t. Nov 28 2026: the intensity fades linearly
 *                   from the trailing ratio (year 1) to a terminal ratio by year 5, and the
 *                   terminal value uses the terminal ratio. The terminal ratio is, in order:
 *                   a reader override (capexTerminalPct), else the median of the company's
 *                   own fiscal-year-spaced trailing capex/revenue history (at least three
 *                   years), floored at D&A/revenue, else the trailing ratio held flat. Holding
 *                   a capex peak flat forever (MSFT: 39% of revenue against 12% D&A) assumes
 *                   the peak is permanent while growth falls to 2.5%, which the model now
 *                   states and lets the reader change, with a capex sensitivity.
 *   FCFF_t        = NOPAT_t + D&A_t - capex_t - change in working capital_t
 * Discount rate: WACC = E/(D+E) x (rf + beta x ERP) + D/(D+E) x cost of debt x (1 - tax).
 * Terminal value: Gordon growth on the year after the forecast, FCFF_{n+1} / (WACC - g).
 * Equity value = enterprise value - debt + cash (- minority interest); per share on diluted
 * shares.
 */
import { quantile, percentileRank } from './history';

export const MODEL_VERSION = 'valuation-model-v2';
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
const median = (xs) => {
  const v = [...xs].sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

/**
 * The terminal capex intensity and where it came from (see the header). Never invented:
 * an override is the reader's, a history median is reported data, a flat ratio is the TTM.
 */
/* Sonar 6.5 (Nov 28 2026): the capex fade toward the history median stays a labelled
   scenario until the default receives financial-methodology approval. The default holds the
   trailing intensity flat (the 6.4 assumption) and reports the fade beside it; the fade is the
   default only when SONAR_DCF_CAPEX_FADE_DEFAULT=1 is set after that approval, or when a
   caller asks for the scenario explicitly. */
export const CAPEX_FADE_LABEL =
  'Scenario: capex intensity fades to the history median (pending methodology approval)';
const fadeIsDefault = () =>
  typeof process !== 'undefined' && process.env?.SONAR_DCF_CAPEX_FADE_DEFAULT === '1';

export function capexPlan({
  capexPct,
  daPct,
  capexHistory = [],
  override = null,
  scenario = null,
}) {
  const hist = (capexHistory || []).map((h) => num(h?.capexPct)).filter((v) => v != null && v >= 0);
  if (num(override) != null && override >= 0)
    return {
      terminalPct: override,
      source: 'override',
      note: "the reader's terminal capex intensity",
      history: hist,
      fadeScenario: null,
    };
  if (hist.length >= 3) {
    const med = median(hist);
    const floored = Math.max(med, daPct);
    const fadeNote = `fades from the trailing ${pct(capexPct)}% to ${pct(floored)}% by year 5: the median of ${hist.length} fiscal-year trailing windows (${hist.map((v) => `${pct(v)}%`).join(', ')})${floored > med ? `, floored at D&A (${pct(daPct)}%)` : ''}`;
    const fadeScenario = { label: CAPEX_FADE_LABEL, terminalPct: floored, note: fadeNote };
    if (scenario === 'capex_fade' || fadeIsDefault())
      return {
        terminalPct: floored,
        source: scenario === 'capex_fade' ? 'scenario' : 'reported',
        note: scenario === 'capex_fade' ? `${CAPEX_FADE_LABEL}: ${fadeNote}` : fadeNote,
        history: hist,
        fadeScenario,
      };
    return {
      terminalPct: capexPct,
      source: 'reported',
      note: `trailing four quarters, held flat (default; ${CAPEX_FADE_LABEL.toLowerCase()} is shown separately)`,
      history: hist,
      fadeScenario,
    };
  }
  return {
    terminalPct: capexPct,
    source: 'reported',
    note: 'trailing four quarters, held flat (fewer than three years of capex history)',
    history: hist,
    fadeScenario: null,
  };
}

/** Capex intensity in forecast year t (1-based): linear from the trailing ratio to terminal. */
export function capexPctAt(i, t) {
  const term = num(i.capexTerminalPct) ?? i.capexPct;
  return i.capexPct + ((term - i.capexPct) * (t - 1)) / (FORECAST_YEARS - 1);
}

export function dcfInputs(
  history,
  {
    beta = null,
    riskFree = null,
    consensusGrowth = null,
    capexTerminalPct = null,
    capexScenario = null,
  } = {},
) {
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
  const capexPct = capex / revenue;
  const daPct = da / revenue;
  const plan = capexPlan({
    capexPct,
    daPct,
    capexHistory: history.capexHistory,
    override: capexTerminalPct,
    scenario: capexScenario,
  });
  return {
    ok: true,
    missing: [],
    inputs: {
      revenue,
      margin: ebit / revenue,
      taxRate,
      taxSource,
      daPct,
      capexPct,
      capexTerminalPct: plan.terminalPct,
      capexSource: plan.source,
      capexNote: plan.note,
      capexHistory: plan.history,
      capexFadeScenario: plan.fadeScenario,
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
      priceAsOf: c.priceAsOf || null,
      priceSource: c.priceSource || null,
      /* Market-value weights need a market cap; without one WACC is the cost of equity. */
      waccWeights: marketCap > 0 ? 'market' : 'equity_only',
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
    const capex = rev * capexPctAt(x, t);
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
    nextRev * (num(x.capexTerminalPct) ?? x.capexPct) -
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
 * Per-share value across terminal capex intensity: D&A (sustaining only), the history
 * median, the midpoint to the trailing ratio, and the trailing ratio held flat (the old
 * assumption). Distinct values only, ascending.
 */
export function sensitivityCapex(i) {
  const hist = i.capexHistory?.length >= 3 ? median(i.capexHistory) : null;
  const pts = [
    ['D&A only', i.daPct],
    ['History median', hist],
    ['Midpoint', hist != null ? (hist + i.capexPct) / 2 : null],
    ['Trailing, held flat', i.capexPct],
  ].filter(([, v]) => num(v) != null);
  const seen = new Set();
  return pts
    .filter(([, v]) => (seen.has(v.toFixed(6)) ? false : seen.add(v.toFixed(6))))
    .sort((a, b) => a[1] - b[1])
    .map(([label, v]) => {
      const out = runDcf(i, { capexTerminalPct: v });
      return {
        label,
        terminalCapexPct: pct(v),
        perShare: out.error ? null : out.perShare,
        current: Math.abs(v - (i.capexTerminalPct ?? i.capexPct)) < 1e-9,
      };
    });
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
  } else if (dcf && !dcf.error && dcf.perShare != null) {
    /* Nov 28 2026: no price is no comparison, not no DCF. */
    out.push({
      kind: 'model',
      text: `The base DCF gives $${fx(dcf.perShare, 2)} per share with a WACC of ${fx(dcf.wacc * 100, 2)}% and terminal growth of ${fx(dcf.terminalGrowth * 100, 1)}%; the terminal value is ${fx((dcf.terminalShare || 0) * 100, 0)}% of enterprise value. No current share price was available, so the value is not compared with one.`,
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
  capexTerminalPct = null,
  capexScenario = null,
}) {
  if (!history) return null;
  const di = dcfInputs(history, {
    beta: market.beta,
    riskFree: market.riskFree,
    consensusGrowth,
    capexTerminalPct,
    capexScenario,
  });
  const dcf = di.ok ? runDcf(di.inputs) : { missing: di.missing };
  const scen = di.ok && !dcf.error ? scenarios(di.inputs) : [];
  const sens = di.ok && !dcf.error ? sensitivityWaccGrowth(di.inputs) : null;
  const sensCapex = di.ok && !dcf.error ? sensitivityCapex(di.inputs) : null;
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
          value:
            Math.abs(di.inputs.capexTerminalPct - di.inputs.capexPct) < 1e-9
              ? `${pct(di.inputs.capexPct)}% of revenue`
              : `${pct(di.inputs.capexPct)}% of revenue in year 1, ${pct(di.inputs.capexTerminalPct)}% by year 5 and in the terminal value`,
          source: di.inputs.capexSource,
          note: di.inputs.capexNote,
          editable: 'capexTerminalPct',
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
          label: 'Share price',
          value: di.inputs.price > 0 ? `$${fx(di.inputs.price, 2)}` : 'not available',
          source: di.inputs.price > 0 ? 'market' : 'unavailable',
          note:
            di.inputs.price > 0
              ? `${di.inputs.priceSource === 'stored_close' ? 'stored close' : 'live quote'} as of ${di.inputs.priceAsOf || 'today'}`
              : 'no live quote or stored close within 10 days; the value is not compared with a price',
        },
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
          note:
            di.inputs.waccWeights === 'market'
              ? 'market-value weights'
              : 'cost of equity only: no market capitalization to weight debt against',
        },
        {
          label: 'Terminal growth',
          value: `${pct(di.inputs.terminalGrowth)}%`,
          source: 'assumption',
          note: 'a stated convention',
        },
      ]
    : [];
  /* Sonar 6.5: the capex fade, valued as a separately labelled scenario beside the default. */
  const fade = di.ok && !dcf.error ? di.inputs.capexFadeScenario : null;
  const fadeRun =
    fade && Math.abs(fade.terminalPct - di.inputs.capexTerminalPct) > 1e-9
      ? runDcf(di.inputs, { capexTerminalPct: fade.terminalPct })
      : null;
  const capexFadeScenario =
    fade && fadeRun && !fadeRun.error
      ? {
          label: fade.label,
          terminalCapexPct: pct(fade.terminalPct),
          perShare: fadeRun.perShare,
          note: fade.note,
          approved: false,
        }
      : null;
  return {
    capexFadeScenario,
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
    sensitivity: { waccGrowth: sens, growthMultiple: sens2, capex: sensCapex },
    conclusion: valuationConclusion({
      history,
      peers: comp,
      dcf: di.ok ? dcf : { missing: di.missing },
      scen,
      inputs: di.inputs,
    }),
  };
}
