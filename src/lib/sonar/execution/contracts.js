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
import {
  awardMatchesAgency,
  agencyMatchState,
  agencyById,
  agencyLabel,
} from '../../contractors/agencies.js';
import { attributeAward } from './entities.js';
import { toAttributionRelations } from '../../sec/entity-relationships.js';

const DAY = 86400000;
const t = (d) => (d ? Date.parse(`${String(d).slice(0, 10)}T00:00:00Z`) : NaN);
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

/* Sonar 6.5.2: two different measures, never combined.
   - award_start_cohort_v1: awards whose recorded start date falls in the period, each with
     everything obligated on it to date (cumulative). Describes a cohort of awards; it is NOT
     obligations incurred in the period and is not used for fiscal-year growth.
   - transaction_period_flow_v1: signed obligation changes of actions dated in the period
     (USAspending transactions). The fiscal-year obligation measure; unavailable until the
     transaction table is ingested and an award's actions are complete. */
export const METHODOLOGY = Object.freeze({
  COHORT: 'award_start_cohort_v1',
  FLOW: 'transaction_period_flow_v1',
});

export const FLOW_BASIS =
  'signed obligation changes (federal_action_obligation) of contract actions dated in the period, deobligations included (USAspending transactions); not the ceiling, not revenue, not cash received';

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
  { agency = null, basis = 'awarding', asOf = null, stats = null } = {},
) {
  const out = {};
  const seen = new Set();
  const today = asOf ? t(asOf) : Infinity;
  for (const r of rows || []) {
    if (!r?.ticker || !r.generated_award_id || seen.has(r.generated_award_id)) continue;
    if (stats && t(r.action_date) > today) stats.futureStart = (stats.futureStart || 0) + 1;
    if (!inPeriod(r.action_date, period) || t(r.action_date) > today) continue;
    /* Sonar 6.5.2: a row whose agency cannot be resolved neither passes nor fails an agency
       filter; it is counted so the company's result is unknown, not a silent "no". */
    const st = agencyMatchState(r, agency, basis);
    if (st === 'unresolved' && stats) {
      const k0 = String(r.ticker).toUpperCase();
      (stats.unresolvedAgency ||= {})[k0] = (stats.unresolvedAgency[k0] || 0) + 1;
    }
    if (st !== 'match') continue;
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
  sic = null,
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
  /* Sonar 6.5.2: banks, insurers and other financial issuers (SIC 6000 to 6799) report
     "revenue" on a different basis (interest and premium income); the ratio is not
     comparable with an industrial company's and is not computed. */
  if (sic != null && Number(sic) >= 6000 && Number(sic) <= 6799) {
    base.reason = `financial_issuer: SIC ${sic} revenue is not comparable for this ratio`;
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
  /* Sonar 6.5.2: rows in the relationship-table shape (entity-relationships.js) are
     validated first; only verified, in-period relationships can join. */
  if ((relations || []).some((r) => r?.child?.identifierType))
    relations = toAttributionRelations(relations).relations;
  let direct = 0;
  let group = 0;
  const included = [];
  for (const r of rows || []) {
    if (!inPeriod(r.action_date, period)) continue;
    if (!awardMatchesAgency(r, opts.agency || null, opts.basis || 'awarding')) continue;
    const a = Number(r.award_amount);
    if (!Number.isFinite(a)) continue;
    const at = attributeAward(
      { recipient: r.recipient_name, ticker: r.ticker, uei: r.recipient_id, date: r.action_date },
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

/* ── transaction-period obligations (Sonar 6.5.2) ──────────────────────────────────── */

/**
 * Signed obligation changes per ticker for actions dated in a period. Transactions carry
 * the award id; the award row (contract_awards_resolved) carries the ticker, the recipient
 * and the agencies. Each source transaction id counts once.
 * @param transactions  [{ source_transaction_id | sourceTransactionId, generated_award_id |
 *                        awardId, action_date | transactionActionDate,
 *                        federal_action_obligation | signedObligationDeltaUsd }]
 * @param awardsById    { [generated_award_id]: award row }
 * -> { [ticker]: { net, grossPositive, deobligations, transactions, agencies, ids } }
 */
export function obligationFlowInPeriod(
  transactions = [],
  awardsById = {},
  period,
  { agency = null, basis = 'awarding', asOf = null, stats = null } = {},
) {
  const out = {};
  const seen = new Set();
  const today = asOf ? t(asOf) : Infinity;
  for (const x of transactions || []) {
    const id = x.source_transaction_id ?? x.sourceTransactionId;
    const awardId = x.generated_award_id ?? x.awardId;
    const date = x.action_date ?? x.transactionActionDate;
    const raw = x.federal_action_obligation ?? x.signedObligationDeltaUsd;
    if (!id || seen.has(id)) {
      if (id && stats) stats.duplicates = (stats.duplicates || 0) + 1;
      continue;
    }
    if (!date) {
      if (stats) stats.missingActionDate = (stats.missingActionDate || 0) + 1;
      continue;
    }
    if (!inPeriod(date, period) || t(date) > today) continue;
    if (raw == null || raw === '' || !Number.isFinite(Number(raw))) continue;
    const award = awardsById[awardId];
    if (!award?.ticker) {
      if (stats) stats.unresolvedRecipient = (stats.unresolvedRecipient || 0) + 1;
      continue;
    }
    const st = agencyMatchState(award, agency, basis);
    const k = String(award.ticker).toUpperCase();
    if (st === 'unresolved' && stats)
      (stats.unresolvedAgency ||= {})[k] = (stats.unresolvedAgency[k] || 0) + 1;
    if (st !== 'match') continue;
    seen.add(id);
    const a = Number(raw);
    const o = (out[k] ||= {
      net: 0,
      grossPositive: 0,
      deobligations: 0,
      transactions: 0,
      agencies: {},
      ids: [],
    });
    o.net += a;
    if (a > 0) o.grossPositive += a;
    if (a < 0) o.deobligations += 1;
    o.transactions += 1;
    const ag = award[`${basis}_agency`] || 'Unknown agency';
    o.agencies[ag] = (o.agencies[ag] || 0) + a;
    o.ids.push(id);
  }
  return out;
}

/**
 * Whether a ticker's transaction record is complete for a period: every award of the
 * ticker that started on or before the period end has a complete sync row. Only then is
 * "no actions in the period" a confirmed zero.
 * -> { [ticker]: { complete, awardsNeeded, awardsSynced, missing: [ids] } }
 */
export function flowCoverage(awards = [], syncedComplete = new Set(), period) {
  const out = {};
  for (const r of awards || []) {
    if (!r?.ticker || !r.generated_award_id) continue;
    if (t(r.action_date) > t(period.to)) continue;
    const k = String(r.ticker).toUpperCase();
    const o = (out[k] ||= { complete: true, awardsNeeded: 0, awardsSynced: 0, missing: [] });
    o.awardsNeeded += 1;
    if (syncedComplete.has(r.generated_award_id)) o.awardsSynced += 1;
    else {
      o.complete = false;
      if (o.missing.length < 20) o.missing.push(r.generated_award_id);
    }
  }
  return out;
}

/**
 * Fiscal-year obligation flow and its change for each ticker, with coverage.
 * A ticker whose transaction record is incomplete for a period is unknown for it; a
 * complete record with no action in the period is a confirmed zero.
 */
export function obligationFlowGrowth({
  transactions,
  awards,
  syncedComplete,
  tickers,
  periods,
  opts = {},
}) {
  const byId = Object.fromEntries((awards || []).map((a) => [a.generated_award_id, a]));
  const cur = obligationFlowInPeriod(transactions, byId, periods.current, opts);
  const pri = obligationFlowInPeriod(transactions, byId, periods.prior, opts);
  const covCur = flowCoverage(awards, syncedComplete, periods.current);
  const covPri = flowCoverage(awards, syncedComplete, periods.prior);
  const out = {};
  for (const raw of tickers) {
    const k = String(raw).toUpperCase();
    const cc = covCur[k];
    const cp = covPri[k];
    const value = (flows, cov) => (flows[k] ? flows[k].net : cov && cov.complete ? 0 : null);
    const r = {
      methodology: METHODOLOGY.FLOW,
      current: value(cur, cc),
      prior: value(pri, cp),
      grossPositive: cur[k] ? cur[k].grossPositive : cc?.complete ? 0 : null,
      deobligations: cur[k]?.deobligations ?? 0,
      concentration: cur[k] ? agencyConcentration(cur[k].agencies) : null,
      coverage: { current: cc || null, prior: cp || null },
      change: null,
      growthPct: null,
      reason: null,
    };
    /* Flow values without complete coverage are partial sums, never shown as the year's total. */
    if (cur[k] && !cc?.complete) r.current = null;
    if (pri[k] && !cp?.complete) r.prior = null;
    if (!cc && !cp) r.reason = 'no award of this company is on record for these periods';
    else if (r.current == null || r.prior == null)
      r.reason = `transaction records incomplete for ${r.current == null ? periods.current.label : periods.prior.label}: the change is unknown`;
    else {
      r.change = r.current - r.prior;
      if (r.prior > 0) r.growthPct = (r.change / r.prior) * 100;
      else r.reason = 'prior-period net obligations were not positive; a growth rate is undefined';
    }
    out[k] = r;
  }
  return out;
}

/**
 * Obligations relative to revenue under a named methodology (Sonar 6.5.2). Wraps the 6.5.1
 * revenue and period rules and adds the full output contract.
 */
export function exposureToRevenue({ methodology, company = null, recipients = [], ...rest }) {
  const flow = methodology === METHODOLOGY.FLOW;
  const r = obligationsToRevenue(rest);
  return {
    ...r,
    metric: flow
      ? 'federal_obligation_flow_to_revenue'
      : 'federal_award_cohort_exposure_to_revenue',
    methodology: flow ? 'transaction_flow_to_latest_filed_revenue_proxy' : r.methodology,
    methodologyVersion: flow ? METHODOLOGY.FLOW : METHODOLOGY.COHORT,
    measureKind: flow ? 'period_flow' : 'award_start_cohort_cumulative',
    numerator: {
      value: r.obligations,
      definition: flow ? FLOW_BASIS : OBLIGATIONS_BASIS,
      period: rest.contractPeriod,
    },
    denominator: {
      value: r.revenue,
      definition:
        'latest filed annual revenue (SEC sec_fundamentals, annual), fiscal year ending within 365 days before the obligations period end',
      period: r.revenuePeriod,
      concept: rest.revenueConcept || null,
    },
    currency: rest.currency || 'USD',
    company,
    recipients,
    qualifications: [
      ...(flow
        ? r.qualifications.map((q) => q.replace(OBLIGATIONS_BASIS, FLOW_BASIS))
        : r.qualifications),
      flow
        ? 'Even an annual obligation flow is not the share of revenue earned from the government: obligations are commitments, recognized revenue follows performance.'
        : 'Award-start cohort: cumulative amounts of awards that started in the period, not obligations incurred in the period.',
    ],
  };
}
