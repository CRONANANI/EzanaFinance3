/**
 * Sonar research engine: the fund mandate source (Sonar for organizations,
 * Nov 2026). For a fund fit run only: the company's profile (sector,
 * industry, market capitalization) checked against the fund's IPS rules
 * and mandate, as one evidence record the assessment cites and a
 * `fundFit` panel the report shows. The checks are deterministic
 * (lib/org-sonar/fund-fit.js); the fund context comes from the route,
 * never from the question text.
 */
import { fmp } from './sources-memo';
import { fitFromChecks, fundSpec, mandateChecks, mandateRecord } from '@/lib/org-sonar/fund-fit';

async function fundMandate({ ticker, fund }, { ms }) {
  if (!ticker || !fund) return { items: [] };
  const prof = await fmp('profile', { symbol: ticker }, Math.max(300, ms - 200)).catch(() => null);
  const p = Array.isArray(prof) ? prof[0] : prof;
  const company = {
    ticker: String(ticker).toUpperCase(),
    name: p?.companyName || null,
    sector: p?.sector || null,
    industry: p?.industry || null,
    marketCap: Number.isFinite(Number(p?.marketCap)) ? Number(p.marketCap) : null,
  };
  const checks = mandateChecks(fund, company);
  return {
    items: [mandateRecord(fund, company, checks)],
    layout: {
      fundFit: {
        fund: fundSpec(fund),
        company,
        checks,
        fit: fitFromChecks(checks),
        blocked: checks.some((c) => c.blocking),
      },
    },
  };
}

export const FUND_RUNNERS = { fund_mandate: fundMandate };
