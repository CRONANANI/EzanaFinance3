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
    revenue_growth: rev != null && revPrev ? rev / revPrev - 1 : null,
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
