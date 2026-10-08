/**
 * Ten fiscal years of one company's federal contracts, rolled up from
 * company_contract_history rows (ticker x fiscal year x agency). Pure, so the
 * check script can test it.
 */
import { currentFiscalYear, HISTORY_YEARS } from '../../contracts/fiscal-year.js';

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** Ten fiscal years (oldest first) with totals, zero-filled. */
export function tenYears(history, fyNow = currentFiscalYear()) {
  const byFy = new Map();
  const byAgency = new Map();
  for (const r of history) {
    const fy = Number(r.fiscal_year);
    const amt = num(r.total_amount) || 0;
    const n = num(r.award_count) || 0;
    const cur = byFy.get(fy) || { fy, total: 0, awards: 0 };
    cur.total += amt;
    cur.awards += n;
    byFy.set(fy, cur);
    const a = byAgency.get(r.awarding_agency) || { agency: r.awarding_agency, total: 0, awards: 0 };
    a.total += amt;
    a.awards += n;
    byAgency.set(r.awarding_agency, a);
  }
  const years = [];
  for (let fy = fyNow - HISTORY_YEARS + 1; fy <= fyNow; fy += 1) {
    years.push(byFy.get(fy) || { fy, total: 0, awards: 0 });
  }
  const agencies = [...byAgency.values()].sort((a, b) => b.total - a.total);
  const total = years.reduce((s, y) => s + y.total, 0);
  const awards = years.reduce((s, y) => s + y.awards, 0);
  return {
    years,
    total,
    awards,
    topAgency: agencies[0]?.agency || null,
    agencies: agencies.slice(0, 6),
    partialFy: fyNow,
  };
}
