/**
 * Research Composer: the deterministic calculations (Nov 22 2026). Pure, unit-tested in
 * scripts/check-sonar-composer.mjs. Every ratio and valuation the composer reports is
 * computed here from filed figures; nothing is estimated by a language model.
 */

const ratio = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : null);

/**
 * Total debt from filed balance-sheet components (Sonar 6.4 final hardening). Pure.
 *
 * Components are lib/sec/concept-map.js debt metrics, each one XBRL concept. Only components
 * dated the same balance-sheet date as `asOf` (the equity date) are used. Total debt is
 * noncurrent debt plus current debt, built so nothing is counted twice:
 *   noncurrent  LongTermDebtNoncurrent; else LongTermDebt minus LongTermDebtCurrent when both
 *               are tagged; else LongTermDebtAndCapitalLeaseObligations (includes finance
 *               leases, flagged)
 *   current     DebtCurrent (all current debt) when tagged; else LongTermDebtCurrent plus
 *               short-term borrowings (ShortTermBorrowings, else CommercialPaper)
 *   LongTermDebt alone (no current tags, no noncurrent tag) is long-term debt including its
 *               current portion by definition; short-term borrowings are added when tagged
 * Status:
 *   complete      both parts known (an explicit 0 is a known 0)
 *   partial       a part is missing (noncurrent debt with no current-debt tag, a revolver tag
 *                 alone, or LongTermDebt beside DebtCurrent with no current portion to separate
 *                 them); the total is a lower bound and is not used as a ratio
 *   unavailable   no debt component for the date
 * A missing component never becomes 0.
 */
export function totalDebt(instant = {}, asOf = null) {
  const at = (k) => {
    const x = instant?.[k];
    if (!x || x.value == null || !Number.isFinite(x.value)) return null;
    if (asOf && x.end && x.end !== asOf) return null;
    return x.value;
  };
  const N = at('debt_noncurrent');
  const T = at('debt_long_term_total');
  const Cp = at('debt_current_portion');
  const Dc = at('debt_current');
  const S = at('short_term_borrowings');
  const CPp = at('commercial_paper');
  const NL = at('debt_and_leases_noncurrent');
  const L = at('line_of_credit');
  const flags = [];
  let noncurrent = null;
  let ncMethod = null;
  if (N != null) {
    noncurrent = N;
    ncMethod = 'LongTermDebtNoncurrent';
  } else if (T != null && Cp != null) {
    noncurrent = T - Cp;
    ncMethod = 'LongTermDebt minus LongTermDebtCurrent';
  } else if (NL != null) {
    noncurrent = NL;
    ncMethod = 'LongTermDebtAndCapitalLeaseObligations';
    flags.push('includes finance lease obligations');
  }
  let current = null;
  let cMethod = null;
  const stb = S != null ? S : CPp;
  if (Dc != null) {
    current = Dc;
    cMethod = 'DebtCurrent';
  } else if (Cp != null) {
    current = Cp + (stb ?? 0);
    cMethod =
      stb != null ? 'LongTermDebtCurrent plus short-term borrowings' : 'LongTermDebtCurrent';
  } else if (stb != null && noncurrent != null) {
    current = stb;
    cMethod = 'short-term borrowings';
    flags.push('current portion of long-term debt not tagged');
  }
  if (noncurrent != null && current != null)
    return {
      value: noncurrent + current,
      status: current === stb && Cp == null && Dc == null ? 'partial' : 'complete',
      method: `${ncMethod} + ${cMethod}`,
      components: { noncurrent, current },
      flags,
    };
  if (noncurrent == null && current == null && T != null) {
    if (Dc != null)
      return {
        value: T,
        status: 'partial',
        method: 'LongTermDebt beside DebtCurrent without a current portion to separate them',
        components: { longTermTotal: T, debtCurrent: Dc },
        flags: ['overlap between LongTermDebt and DebtCurrent cannot be resolved'],
      };
    return {
      value: T + (stb ?? 0),
      status: 'complete',
      method:
        stb != null
          ? 'LongTermDebt + short-term borrowings'
          : 'LongTermDebt (current and noncurrent)',
      components: { longTermTotal: T, shortTerm: stb },
      flags,
    };
  }
  if (noncurrent == null && current != null && T != null)
    return {
      value: T,
      status: 'partial',
      method: 'LongTermDebt beside DebtCurrent without a current portion to separate them',
      components: { longTermTotal: T, current },
      flags: ['overlap between LongTermDebt and DebtCurrent cannot be resolved'],
    };
  if (noncurrent != null)
    return {
      value: noncurrent,
      status: 'partial',
      method: `${ncMethod} only`,
      components: { noncurrent },
      flags: [...flags, 'current debt not tagged for this date'],
    };
  if (current != null)
    return {
      value: current,
      status: 'partial',
      method: `${cMethod} only`,
      components: { current },
      flags: [...flags, 'noncurrent debt not tagged for this date'],
    };
  if (L != null)
    return {
      value: L,
      status: 'partial',
      method: 'LineOfCredit only',
      components: { lineOfCredit: L },
      flags: ['only a credit facility balance is tagged'],
    };
  return { value: null, status: 'unavailable', method: null, components: {}, flags };
}

/* SIC ranges whose balance sheets are funded by deposits, policy reserves or customer
   balances, where debt to equity is not a leverage measure (REITs, 6798, are excluded). */
export function isFinancialInstitution(sic) {
  const n = Number(sic);
  return Number.isFinite(n) && n >= 6000 && n <= 6799 && n !== 6798;
}

/**
 * Debt to equity with its status (Sonar 6.4 final hardening). Pure.
 * @returns {{ value: number|null, status: string, reason: string|null, debt: object }}
 */
export function debtToEquity(f, { sic = f?.sic ?? null } = {}) {
  const eq = f?.instant?.equity;
  const equity = eq?.value != null && Number.isFinite(eq.value) ? eq.value : null;
  const debt = totalDebt(f?.instant || {}, eq?.end || null);
  if (isFinancialInstitution(sic))
    return {
      value: null,
      status: 'not_meaningful',
      reason: 'financial institution (deposits and reserves fund the balance sheet)',
      debt,
    };
  if (equity == null)
    return { value: null, status: 'unavailable', reason: 'shareholders’ equity not filed', debt };
  if (equity <= 0)
    return {
      value: null,
      status: 'not_meaningful',
      reason: 'zero or negative shareholders’ equity',
      debt,
    };
  if (debt.status === 'unavailable')
    return {
      value: null,
      status: 'unavailable',
      reason: 'no debt figures filed for the balance-sheet date',
      debt,
    };
  if (debt.status === 'partial')
    return {
      value: null,
      status: 'qualified',
      reason: debt.flags.join('; ') || 'total debt incomplete',
      debt,
    };
  return { value: debt.value / equity, status: 'complete', reason: null, debt };
}

/**
 * Year-over-year revenue growth, only between comparable figures (Sonar 6.4 final
 * integration). Two fiscal years are compared only when:
 *   - both are filed (missing is never zero) and the prior year is positive
 *   - their period ends are 330 to 400 days apart (consecutive annual frames, no skipped
 *     or mixed-length years)
 *   - they use the same XBRL revenue concept when both rows record one, so revenue gross
 *     of excise taxes (RevenueFromContractWithCustomerIncludingAssessedTax) is never
 *     divided by revenue net of them, and a company that switched tags reports no growth
 *     rather than a tagging artefact
 * Rows stored before taxonomy_concept existed carry no concept and are compared as before.
 * Pure. @returns {{ value: number|null, reason: string|null }}
 */
export function revenueGrowth(list) {
  const cur = list?.[0];
  const prev = list?.[1];
  if (!cur || cur.value == null || !Number.isFinite(cur.value))
    return { value: null, reason: 'revenue not filed' };
  if (!prev || prev.value == null || !Number.isFinite(prev.value))
    return { value: null, reason: 'prior-year revenue not filed' };
  if (!(prev.value > 0)) return { value: null, reason: 'prior-year revenue is zero or negative' };
  const days = (Date.parse(cur.end) - Date.parse(prev.end)) / 86400000;
  if (!(days >= 330 && days <= 400))
    return { value: null, reason: 'the two fiscal years are not consecutive' };
  if (cur.concept && prev.concept && cur.concept !== prev.concept)
    return {
      value: null,
      reason: `revenue was tagged ${prev.concept} then ${cur.concept}; not comparable`,
    };
  return { value: cur.value / prev.value - 1, reason: null };
}

/** Ratios from one company's filed figures. Pure. */
export function companyRatios(f) {
  if (!f) return null;
  const a = (c, i = 0) => f.annual?.[c]?.[i]?.value ?? null;
  const rev = a('revenue');
  const revPrev = a('revenue', 1);
  const growth = revenueGrowth(f.annual?.revenue);
  const ocf = a('operating_cash_flow');
  const capex = a('capex');
  const fcf = ocf != null && capex != null ? ocf - Math.abs(capex) : null;
  const equity = f.instant?.equity?.value ?? null;
  /* Sonar 6.4 final hardening: total debt from its components; the ratio only when the
     total is complete (never 0.00x because a component is missing). */
  const de = debtToEquity(f, { sic: f.sic ?? null });
  return {
    fiscalYearEnd: f.annual?.revenue?.[0]?.end || null,
    revenue: rev,
    revenue_prior: revPrev,
    revenue_growth: growth.value,
    revenue_growth_reason: growth.reason,
    revenue_concept: f.annual?.revenue?.[0]?.concept || null,
    /* Sonar 6.2: net income growth, only between two positive years (a swing from a loss
       has no meaningful growth rate). */
    earnings_growth:
      a('net_income') != null && a('net_income', 1) > 0 && a('net_income') > 0
        ? a('net_income') / a('net_income', 1) - 1
        : null,
    gross_margin: ratio(a('gross_profit'), rev),
    operating_margin: ratio(a('operating_income'), rev),
    net_margin: ratio(a('net_income'), rev),
    fcf,
    fcf_margin: ratio(fcf, rev),
    roe: equity && equity > 0 ? ratio(a('net_income'), equity) : null,
    debt_to_equity: de.value,
    debt_to_equity_status: de.status,
    debt_to_equity_reason: de.reason,
    total_debt: de.debt.status === 'complete' ? de.debt.value : null,
    total_debt_method: de.debt.method,
    total_debt_status: de.debt.status,
    /* the balance-sheet date both figures describe */
    balance_sheet_date: f.instant?.equity?.end || null,
  };
}

/** A free-cash-flow DCF for one company. Pure; every input is returned with the result. */
export function dcfValue({ fcf, growth, wacc, terminal, years, cash = 0, debt = 0, shares }) {
  if (!Number.isFinite(fcf) || fcf <= 0)
    return {
      ok: false,
      reason: 'Free cash flow is negative or missing, so a DCF is not meaningful.',
    };
  if (!(wacc > terminal))
    return { ok: false, reason: 'The discount rate must exceed terminal growth.' };
  /* A missing debt figure is not zero debt (Sonar 6.4 final hardening). */
  if (!Number.isFinite(debt))
    return {
      ok: false,
      reason: 'No debt figure is filed, so equity value cannot be derived from enterprise value.',
    };
  let pv = 0;
  let cf = fcf;
  for (let t = 1; t <= years; t += 1) {
    cf *= 1 + growth;
    pv += cf / (1 + wacc) ** t;
  }
  const tv = (cf * (1 + terminal)) / (wacc - terminal);
  const pvTv = tv / (1 + wacc) ** years;
  const ev = pv + pvTv;
  const equity = ev + (cash || 0) - (debt || 0);
  return {
    ok: true,
    ev,
    equity,
    perShare: shares > 0 ? equity / shares : null,
    terminalShare: ev > 0 ? pvTv / ev : null,
  };
}

/* ── Sonar 6.4: trailing twelve months and valuation ─────────────────────────────── */

const DAY = 86400000;
const days = (a, b) => (Date.parse(a) - Date.parse(b)) / DAY;

/** Filed figures older than this (from the period end to today) are stale. */
export const STALE_FILING_DAYS = 270;
/** A share count older than this is stale (companies file one each quarter). */
export const STALE_SHARES_DAYS = 200;
/** A price older than this is stale. */
export const STALE_PRICE_DAYS = 7;

/**
 * Trailing twelve months of a flow (net income, revenue) from filed figures.
 *
 * TTM = latest annual + quarters reported after it - the same quarters a year earlier.
 * Fourth quarters are not filed on their own (they are inside the 10-K), so the roll
 * forward never needs one. When a later quarter has no year-earlier counterpart (within
 * 20 days), the roll forward is not possible and the latest annual figure is used, with
 * `method: 'annual'`. Only periods ending on or before `asOf` are used (no look-ahead).
 *
 * @param {Array<{end:string,value:number}>} annual
 * @param {Array<{end:string,value:number}>} quarters
 * @returns {{ value:number|null, through:string|null, method:string, stale:boolean, quartersUsed:number }}
 */
export function ttmFigure(
  annual = [],
  quarters = [],
  { asOf = new Date().toISOString().slice(0, 10) } = {},
) {
  const A = [...annual]
    .filter((x) => Number.isFinite(x?.value) && x.end <= asOf)
    .sort((a, b) => (a.end < b.end ? 1 : -1))[0];
  if (!A) return { value: null, through: null, method: 'none', stale: false, quartersUsed: 0 };
  const Q = quarters.filter((x) => Number.isFinite(x?.value) && x.end <= asOf);
  const after = Q.filter((x) => x.end > A.end).sort((a, b) => (a.end < b.end ? -1 : 1));
  let value = A.value;
  let through = A.end;
  let method = 'annual';
  if (after.length) {
    const pairs = after.map((x) => {
      const target = Date.parse(x.end) - 365 * DAY;
      const prior = Q.find((y) => Math.abs(Date.parse(y.end) - target) <= 20 * DAY);
      return { x, prior };
    });
    if (pairs.every((p) => p.prior)) {
      value = A.value + pairs.reduce((s, p) => s + p.x.value - p.prior.value, 0);
      through = after[after.length - 1].end;
      method = 'annual+quarters';
    }
  }
  return {
    value,
    through,
    method,
    stale: days(asOf, through) > STALE_FILING_DAYS,
    quartersUsed: method === 'annual' ? 0 : after.length,
  };
}

/**
 * Valuation from TTM figures, a filed share count and an authorized price.
 * P/E is not meaningful for zero or negative earnings (null, `peStatus: 'negative'`);
 * earnings yield (E/P) stays defined and is negative. Any stale input is named and the
 * ratios that depend on it are withheld rather than computed on old data.
 */
export function valuationRatios({ ni, rev, shares, price, asOf }) {
  const out = {
    marketCap: null,
    pe: null,
    ps: null,
    earningsYield: null,
    peStatus: null,
    stale: [],
    missing: [],
  };
  if (!price || !Number.isFinite(price.price) || price.price <= 0) out.missing.push('price');
  else if (days(asOf, price.asOf) > STALE_PRICE_DAYS) out.stale.push(`price from ${price.asOf}`);
  if (!shares || !Number.isFinite(shares.value) || shares.value <= 0)
    out.missing.push('share count');
  else if (days(asOf, shares.end) > STALE_SHARES_DAYS)
    out.stale.push(`share count from ${shares.end}`);
  if (!ni || ni.value == null) out.missing.push('TTM net income');
  else if (ni.stale) out.stale.push(`earnings through ${ni.through}`);
  if (!rev || rev.value == null) out.missing.push('TTM revenue');
  else if (rev.stale) out.stale.push(`revenue through ${rev.through}`);
  if (
    out.missing.includes('price') ||
    out.missing.includes('share count') ||
    out.stale.some((s) => /^price|^share/.test(s))
  )
    return out;
  out.marketCap = price.price * shares.value;
  if (ni && ni.value != null && !ni.stale) {
    out.earningsYield = ni.value / out.marketCap;
    if (ni.value > 0) out.pe = out.marketCap / ni.value;
    else out.peStatus = 'negative';
  }
  if (rev && rev.value != null && !rev.stale && rev.value > 0) out.ps = out.marketCap / rev.value;
  return out;
}
