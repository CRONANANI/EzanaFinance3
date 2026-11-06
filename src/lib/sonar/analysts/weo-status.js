/**
 * Is an IMF World Economic Outlook value actual, a staff estimate, or a projection?
 *
 * Each country has its own last actual year per indicator group (from the WEO Database
 * Appendix, reference/weo-latest-actual.js). Years after it are staff estimates even when
 * they are in the past; the current year and later are projections. Fiscal-year entries
 * ("2024/25") count as their ending calendar year.
 *
 * indicatorGroup: 'nationalAccounts' (GDP, growth, deflators), 'cpi' (inflation),
 * 'governmentFinance' (debt, balance), 'balanceOfPayments' (current account, trade).
 *
 * Pure. Update the reference file every April and October with the new appendix.
 */
import REF from './reference/weo-latest-actual.js';

export const WEO_GROUP_OF_FAMILY = {
  gdp_growth: 'nationalAccounts',
  inflation_annual: 'cpi',
  gov_debt: 'governmentFinance',
  gov_balance: 'governmentFinance',
  current_account: 'balanceOfPayments',
  unemployment: 'nationalAccounts',
};

function endYear(v) {
  if (!v) return null;
  const m = /^(\d{4})(?:\/(\d{2}))?$/.exec(String(v));
  if (!m) return null;
  return m[2] ? Number(m[1].slice(0, 2) + m[2]) : Number(m[1]);
}

/** Last actual calendar year for a country and indicator group, or null. */
export function weoLatestActual(iso3, group, ref = REF) {
  return endYear(ref?.countries?.[String(iso3 || '').toUpperCase()]?.[group]);
}

/**
 * @returns 'actual' | 'estimate' | 'projection' | 'unknown'
 * `now` defaults to today; the projection boundary is the current calendar year.
 */
export function weoStatus(iso3, group, year, { now = new Date(), ref = REF } = {}) {
  const y = Number(String(year).slice(0, 4));
  if (!Number.isFinite(y)) return 'unknown';
  if (y >= now.getUTCFullYear()) return 'projection';
  const last = weoLatestActual(iso3, group, ref);
  if (last == null) return 'unknown';
  return y <= last ? 'actual' : 'estimate';
}

/** The WEO vintage the reference table belongs to, for citations ("October 2026"). */
export const WEO_VINTAGE = REF?.vintage || null;
