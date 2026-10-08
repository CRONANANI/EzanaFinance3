/**
 * Capitol Watch company card: pure shaping helpers (client-safe, testable).
 */

const YEARS = 10;
const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** "Amazon.com, Inc. - Common Stock" -> "Amazon.com, Inc." */
export function cleanAssetName(s) {
  return String(s || '')
    .replace(/\s*(?:[-–]\s*)?(?:new\s+)?(?:class [a-z]\s+)?(?:common|ordinary|preferred)\b.*$/i, '')
    .replace(/\s*\((?:[A-Z.]{1,6})\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ten fiscal years of contract rows (ticker x FY x agency) as a series, the
 * agency split and totals. Missing years are zeros, so the bars line up.
 */
export function contractSummary(rows = [], fyTo) {
  const to = Number(fyTo) || Math.max(0, ...rows.map((r) => Number(r.fiscal_year) || 0));
  if (!to) return { fyFrom: null, fyTo: null, years: [], agencies: [], total: 0, count: 0 };
  const from = to - YEARS + 1;
  const byYear = new Map();
  const byAgency = new Map();
  let total = 0;
  let count = 0;
  for (const r of rows) {
    const fy = Number(r.fiscal_year);
    if (!(fy >= from && fy <= to)) continue;
    const amt = num(r.total_amount) || 0;
    const n = Number(r.award_count) || 0;
    const y = byYear.get(fy) || { fy, total: 0, n: 0 };
    y.total += amt;
    y.n += n;
    byYear.set(fy, y);
    const ag = r.awarding_agency || 'Other';
    const a = byAgency.get(ag) || { agency: ag, total: 0, n: 0 };
    a.total += amt;
    a.n += n;
    byAgency.set(ag, a);
    total += amt;
    count += n;
  }
  const years = [];
  for (let fy = from; fy <= to; fy += 1) years.push(byYear.get(fy) || { fy, total: 0, n: 0 });
  const agencies = [...byAgency.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)
    .map((a) => ({ ...a, share: total > 0 ? a.total / total : 0 }));
  return { fyFrom: from, fyTo: to, years, agencies, total, count };
}
