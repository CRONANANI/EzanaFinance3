/**
 * Research Composer: the deterministic calculations (Nov 22 2026). Pure, unit-tested in
 * scripts/check-sonar-composer.mjs. Every ratio and valuation the composer reports is
 * computed here from filed figures; nothing is estimated by a language model.
 */

const ratio = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : null);

/** Ratios from one company's filed figures. Pure. */
export function companyRatios(f) {
  if (!f) return null;
  const a = (c, i = 0) => f.annual?.[c]?.[i]?.value ?? null;
  const rev = a('revenue');
  const revPrev = a('revenue', 1);
  const ocf = a('operating_cash_flow');
  const capex = a('capex');
  const fcf = ocf != null && capex != null ? ocf - Math.abs(capex) : null;
  const equity = f.instant?.equity?.value ?? null;
  const debt = f.instant?.long_term_debt?.value ?? null;
  return {
    fiscalYearEnd: f.annual?.revenue?.[0]?.end || null,
    revenue: rev,
    revenue_prior: revPrev,
    revenue_growth: rev != null && revPrev ? rev / revPrev - 1 : null,
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
    debt_to_equity: equity && equity > 0 && debt != null ? debt / equity : null,
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
