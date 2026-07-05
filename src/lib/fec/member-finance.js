/**
 * Build a full campaign-finance snapshot for one member from OpenFEC — SERVER
 * ONLY. Shared by the ingest cron (writes the cache) and the member-finance
 * route's live-fallback path (cache miss). Every value comes from a real FEC
 * field; missing data yields zeros/empties, never fabricated numbers.
 */
import {
  getCandidateTotals,
  scheduleABySizeByCandidate,
  scheduleAByStateByCandidate,
  scheduleAByEmployer,
  scheduleAByOccupation,
  scheduleEByCandidate,
  communicationCostsByCandidate,
  scheduleBByPurpose,
  getCandidateCommittees,
} from './client';
import {
  normalizeCandidateTotals,
  normalizeSizeBuckets,
  normalizeTopStates,
  normalizeByEmployer,
  normalizeByOccupation,
  normalizeScheduleE,
  sumCommunicationCosts,
  normalizeByPurpose,
} from './normalize';
import { resolveFecCandidateId } from './join';
import { memberByBioguide } from '@/lib/politicians/member-directory';

const first = (res) => (Array.isArray(res?.data?.results) ? res.data.results[0] : null) || {};
const rows = (res) => (Array.isArray(res?.data?.results) ? res.data.results : []);

/**
 * @param {string} bioguideId
 * @param {{cycle:number, budget?:object, deep?:boolean}} opts
 *   deep=true also pulls donor/outside/spending (used by the cron + modal). The
 *   list card only needs totals, so it can run shallow to save requests.
 * @returns {Promise<object|null>} normalized snapshot, or null if unresolvable.
 */
export async function buildMemberFinance(bioguideId, { cycle, budget, deep = true } = {}) {
  const { candidateId, source } = await resolveFecCandidateId(bioguideId, { cycle, budget });
  if (!candidateId) return null;

  const member = memberByBioguide(bioguideId) || {};
  const totalsRes = await getCandidateTotals(candidateId, { cycle }, { budget });
  const totals = normalizeCandidateTotals(first(totalsRes));

  const [sizeRes, statesRes] = await Promise.all([
    scheduleABySizeByCandidate(candidateId, { cycle }, { budget }),
    scheduleAByStateByCandidate(candidateId, { cycle }, { budget }),
  ]);
  const sizeBuckets = normalizeSizeBuckets(rows(sizeRes));
  const topStates = normalizeTopStates(rows(statesRes));

  const base = {
    bioguideId,
    candidateId,
    idSource: source,
    name: member.fullName || null,
    party: member.party || totals.party || null,
    office:
      totals.office ||
      (member.chamber === 'Senate' ? 'S' : member.chamber === 'House' ? 'H' : null),
    state: totals.state || member.state || null,
    raised: totals.raised,
    spent: totals.spent,
    cashOnHand: totals.cashOnHand,
    individualItemized: totals.individualItemized,
    pac: totals.pac,
    debts: totals.debts,
    hasRaisedFunds: totals.hasRaisedFunds,
    coverageStart: totals.coverageStart,
    coverageEnd: totals.coverageEnd,
    sizeBuckets,
    topStates,
    cycle,
    source: 'FEC (api.open.fec.gov)',
  };

  if (!deep) return base;

  // Donor + outside + spending need the principal committee id(s).
  const commRes = await getCandidateCommittees(candidateId, { cycle }, { budget });
  const committees = rows(commRes)
    .map((c) => c.committee_id)
    .filter(Boolean);
  const primaryCommittee = committees[0] || null;

  let byEmployer = [];
  let byOccupation = [];
  let spendingByPurpose = [];
  if (primaryCommittee) {
    const [empRes, occRes, purposeRes] = await Promise.all([
      scheduleAByEmployer(primaryCommittee, { cycle }, { budget }),
      scheduleAByOccupation(primaryCommittee, { cycle }, { budget }),
      scheduleBByPurpose(primaryCommittee, { cycle }, { budget }),
    ]);
    byEmployer = normalizeByEmployer(rows(empRes));
    byOccupation = normalizeByOccupation(rows(occRes));
    spendingByPurpose = normalizeByPurpose(rows(purposeRes));
  }

  const [seRes, ccRes] = await Promise.all([
    scheduleEByCandidate(candidateId, { cycle }, { budget }),
    communicationCostsByCandidate(candidateId, { cycle }, { budget }),
  ]);
  const outside = normalizeScheduleE(rows(seRes));
  const communicationCost = sumCommunicationCosts(rows(ccRes));

  return {
    ...base,
    byEmployer,
    byOccupation,
    spendingByPurpose,
    outside: {
      supportTotal: outside.supportTotal,
      opposeTotal: outside.opposeTotal,
      net: outside.supportTotal - outside.opposeTotal,
      communicationCost,
      byCommittee: outside.byCommittee,
    },
  };
}
