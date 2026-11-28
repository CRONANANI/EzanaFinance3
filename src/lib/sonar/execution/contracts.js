/**
 * Federal contract measures for research (Sonar 6.5.1, Nov 28 2026).
 *
 * Source semantics (inspected in the ingest, src/app/api/cron/ingest-usaspending/route.js):
 *   - one row per award (upsert on generated_award_id), so summing rows never counts the
 *     transactions of one award twice; modifications and deobligations are NOT separate
 *     rows, they are already netted into the award's amount;
 *   - `award_amount` is USAspending's "Award Amount", for contracts the amount obligated to
 *     date. It is never the ceiling (base and all options), never recognized revenue and
 *     never cash received;
 *   - `action_date` holds the award's "Start Date" (period of performance start). An award is
 *     placed in the period in which it started, with everything obligated on it to date.
 *     So "obligations in a period" here means: obligated to date on awards that started in
 *     the period. That is the stated proxy everywhere it is used;
 *   - a negative amount (net deobligation) is preserved.
 *
 * Absence is not zero: a company with no resolved award in a period has no OBSERVED
 * obligations in this dataset (recipients that never resolved to a ticker are invisible), so
 * growth against an empty prior period is unknown, never "up from zero".
 *
 * Pure. Unit-tested in scripts/check-sonar-6-5-1.mjs.
 */
import { awardMatchesAgency, agencyById, agencyLabel } from '../../contractors/agencies.js';
import { attributeAward } from './entities.js';

const DAY = 86400000;
const t = (d) => (d ? Date.parse(`${String(d).slice(0, 10)}T00:00:00Z`) : NaN);
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

export const OBLIGATIONS_BASIS =
  'obligated to date on prime contract awards that started in the period (USAspending Award Amount, by award start date); not the ceiling, not revenue, not cash received';

/** The latest complete federal fiscal year (Oct 1 to Sep 30) and the one before it. */
export function comparableFederalYears(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const latest = m >= 9 ? y : y - 1; // FY ending Sep 30 of `latest` is complete
  const fy = (n) => ({
    kind: 'federal_fiscal_year',
    fy: n,
    from: `${n - 1}-10-01`,
    to: `${n}-09-30`,
    label: `federal FY${n}`,
    complete: true,
  });
  return { current: fy(latest), prior: fy(latest - 1) };
}

/** Trailing 12 months ending today and the 12 months before (labelled; complete by definition). */
export function comparableTrailing(now = new Date()) {
  const end = t(iso(now.getTime()));
  const cur = {
    kind: 'trailing_12m',
    from: iso(end - 364 * DAY),
    to: iso(end),
    label: 'trailing 12 months',
    complete: true,
  };
  const prior = {
    kind: 'trailing_12m',
    from: iso(end - 729 * DAY),
    to: iso(end - 365 * DAY),
    label: 'preceding 12 months',
    complete: true,
  };
  return { current: cur, prior };
}

const inPeriod = (d, p) => {
  const x = t(d);
  return Number.isFinite(x) && x >= t(p.from) && x <= t(p.to);
};

/**
 * Obligations per ticker in one period.
 * -> { [ticker]: { net, grossPositive, awards, newAwards, deobligations, agencies: {name: net}, ids } }
 */
export function obligationsInPeriod(
  rows = [],
  period,
  { agency = null, basis = 'awarding', asOf = null } = {},
) {
  const out = {};
  const seen = new Set();
  const today = asOf ? t(asOf) : Infinity;
  for (const r of rows || []) {
    if (!r?.ticker || !r.generated_award_id || seen.has(r.generated_award_id)) continue;
    if (!inPeriod(r.action_date, period) || t(r.action_date) > today) continue;
    if (!awardMatchesAgency(r, agency, basis)) continue;
    const a = Number(r.award_amount);
    if (r.award_amount == null || r.award_amount === '' || !Number.isFinite(a)) continue;
    seen.add(r.generated_award_id);
    const k = String(r.ticker).toUpperCase();
    const o = (out[k] ||= {
      net: 0,
      grossPositive: 0,
      awards: 0,
      newAwards: 0,
      deobligations: 0,
      agencies: {},
      ids: [],
    });
    o.net += a;
    if (a > 0) o.grossPositive += a;
    else if (a < 0) o.deobligations += 1;
    o.awards += 1;
    if (a > 0) o.newAwards += 1;
    const ag = r[`${basis}_agency`] || 'Unknown agency';
    o.agencies[ag] = (o.agencies[ag] || 0) + a;
    o.ids.push(r.generated_award_id);
  }
  return out;
}

/** Share of the largest agency in a company's positive obligations (0..1), or null. */
export function agencyConcentration(agencies = {}) {
  const pos = Object.values(agencies).filter((v) => v > 0);
  const total = pos.reduce((s, v) => s + v, 0);
  if (!(total > 0)) return null;
  return Math.max(...pos) / total;
}

/**
 * Comparable-period change for each ticker in `tickers`.
 * -> { [ticker]: { current, prior, change, growthPct, grossPositive, concentration, reason } }
 */
export function obligationsGrowth(rows, tickers, periods, opts = {}) {
  const cur = obligationsInPeriod(rows, periods.current, opts);
  const pri = obligationsInPeriod(rows, periods.prior, opts);
  const out = {};
  for (const raw of tickers) {
    const k = String(raw).toUpperCase();
    const c = cur[k];
    const p = pri[k];
    const r = {
      current: c ? c.net : null,
      prior: p ? p.net : null,
      grossPositive: c ? c.grossPositive : null,
      concentration: c ? agencyConcentration(c.agencies) : null,
      change: null,
      growthPct: null,
      reason: null,
    };
    if (!c && !p)
      r.reason = `no resolved award observed in ${periods.current.label} or ${periods.prior.label}`;
    else if (!p)
      r.reason = `no resolved award observed in ${periods.prior.label}: the change is unknown, not growth from zero`;
    else if (!c)
      r.reason = `no resolved award observed in ${periods.current.label}: the change is unknown, not a fall to zero`;
    else {
      r.change = c.net - p.net;
      r.growthPct = p.net > 0 ? (r.change / p.net) * 100 : null;
      if (r.growthPct == null)
        r.reason = 'prior-period net obligations were not positive; a growth rate is undefined';
    }
    out[k] = r;
  }
  return out;
}

/**
 * Obligations relative to revenue, one company.
 * Revenue must be filed, positive, and for a fiscal year ending within `maxGapDays` before
 * the obligation period's end and no later than it (latest filed annual revenue proxy).
 * -> { ticker, obligations, revenue, exposureRatio, contractPeriod, revenuePeriod,
 *      attribution, coverage, methodology, missing: [], qualifications: [], reason }
 */
export function obligationsToRevenue({
  ticker,
  obligations,
  revenue,
  revenueFyEnd,
  contractPeriod,
  attribution = 'direct',
  maxGapDays = 365,
  sources = [],
  currency = 'USD',
  revenueCurrency = 'USD',
}) {
  const base = {
    ticker,
    obligations: obligations ?? null,
    revenue: revenue ?? null,
    exposureRatio: null,
    contractPeriod,
    revenuePeriod: revenueFyEnd ? { kind: 'company_fiscal_year', end: revenueFyEnd } : null,
    attribution,
    coverage: 'unavailable',
    methodology: 'obligations_to_latest_filed_revenue_proxy',
    sources,
    missing: [],
    qualifications: [
      `Obligations: ${OBLIGATIONS_BASIS}.`,
      'An exposure proxy, not the share of reported revenue that comes from the government.',
    ],
    reason: null,
  };
  if (obligations == null) {
    base.missing.push('obligations');
    base.reason = 'no resolved award observed in the period';
    return base;
  }
  if (revenue == null || revenue === '') {
    base.missing.push('revenue');
    base.reason = 'revenue_missing: no filed annual revenue';
    return base;
  }
  if (!(Number(revenue) > 0)) {
    base.reason = 'revenue_zero: filed revenue is not positive; the ratio is undefined';
    return base;
  }
  if (currency !== revenueCurrency) {
    base.reason = `currency mismatch: obligations in ${currency}, revenue in ${revenueCurrency}`;
    return base;
  }
  const gap = (t(contractPeriod.to) - t(revenueFyEnd)) / DAY;
  if (!Number.isFinite(gap) || gap < 0 || gap > maxGapDays) {
    base.reason = `period: revenue fiscal year ending ${revenueFyEnd || 'unknown'} is not within ${maxGapDays} days before the obligations period end ${contractPeriod.to}`;
    return base;
  }
  base.exposureRatio = Number(obligations) / Number(revenue);
  base.coverage = 'complete';
  base.qualifications.push(
    `Revenue is the fiscal year ending ${revenueFyEnd}, ${Math.round(gap)} days before the obligations period ends; the periods overlap only in part.`,
  );
  return base;
}

/**
 * Group-scope obligations for one company: direct awards plus awards to verified
 * subsidiaries (entities.attributeAward). Unverified and name-only matches never join.
 */
export function groupObligations(rows, company, relations, period, opts = {}) {
  let direct = 0;
  let group = 0;
  const included = [];
  for (const r of rows || []) {
    if (!inPeriod(r.action_date, period)) continue;
    if (!awardMatchesAgency(r, opts.agency || null, opts.basis || 'awarding')) continue;
    const a = Number(r.award_amount);
    if (!Number.isFinite(a)) continue;
    const at = attributeAward(
      { recipient: r.recipient_name, ticker: r.ticker, uei: r.recipient_id },
      company,
      relations,
    );
    if (!at.joins) continue;
    if (at.attribution === 'direct') direct += a;
    group += a;
    included.push({ id: r.generated_award_id, attribution: at.attribution, amount: a });
  }
  return {
    direct: included.some((x) => x.attribution === 'direct') ? direct : null,
    group: included.length ? group : null,
    included,
  };
}

/** Labels for a result that applied an agency filter. */
export function agencyBasisNote(agencyId, basis) {
  const a = agencyById(agencyId);
  return a
    ? `Agency filter: ${agencyLabel(a, basis)}. Matched on the stored USAspending toptier agency name exactly.`
    : null;
}
