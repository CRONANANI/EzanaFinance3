/**
 * Which companies' filings the disclosures ingest reads, and which filings
 * (Nov 2026, deep research). Pure apart from reading the registry seed.
 */
import { INDUSTRY_SEED, customersOf } from '@/lib/sonar/industries';

const FORMS = new Set(['10-Q', '10-K', '10-K/A', '10-Q/A', '20-F']);

/** The tickers to cover: registry companies, their customers, and the env list. */
export function disclosureTickers(env = process.env) {
  const out = new Set();
  for (const c of INDUSTRY_SEED.companies) {
    if (c.ticker && c.is_public !== false) out.add(String(c.ticker).toUpperCase());
    for (const k of customersOf(c.ticker)) out.add(k.ticker);
  }
  for (const t of String(env.SONAR_DISCLOSURE_TICKERS || '').split(',')) {
    if (t.trim()) out.add(t.trim().toUpperCase());
  }
  return [...out].sort();
}

/** The newest periodic filings in a submissions payload, newest first. */
export function latestPeriodic(sub, { limit = 2, since = null } = {}) {
  const r = sub?.filings?.recent || {};
  const n = (r.accessionNumber || []).length;
  const rows = [];
  for (let i = 0; i < n; i += 1) {
    if (!FORMS.has(r.form?.[i])) continue;
    if (since && String(r.filingDate?.[i] || '') < since) continue;
    rows.push({
      accessionNo: r.accessionNumber[i],
      form: r.form[i],
      filedAt: r.filingDate?.[i] || null,
      periodEnd: r.reportDate?.[i] || null,
      primaryDoc: r.primaryDocument?.[i] || null,
    });
  }
  return rows.sort((a, b) => String(b.filedAt).localeCompare(String(a.filedAt))).slice(0, limit);
}
