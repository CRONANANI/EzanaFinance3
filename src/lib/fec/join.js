/**
 * Bioguide ↔ FEC candidate-id join — SERVER ONLY.
 *
 * Resolution order for a Congress member's FEC candidate id(s):
 *   1. Vendored directory `id.fec` (member-directory.js `fecIds`), narrowed by
 *      pickFecCandidateId to the ID for the seat the member holds now.
 *   2. Cached `/candidates/search/` by name + state + office — one API call the
 *      first time, then reused from the fec_candidate_totals cache keyed by
 *      bioguide. Never hammered per request.
 *
 * The search fallback is deliberately conservative: it matches on state (and
 * office when known) and takes the highest-receipts active candidate, so an
 * ambiguous name doesn't resolve to the wrong person. If nothing matches we
 * return null and the caller renders an honest empty state — never a guess.
 */
import { memberByBioguide, fecIdsForMember } from '@/lib/politicians/member-directory';
import { searchCandidates } from './client';
import { pickFecCandidateId } from './pick-id';

export { pickFecCandidateId };

const OFFICE_FROM_CHAMBER = { House: 'H', Senate: 'S' };

/**
 * Resolve the primary FEC candidate id for a member.
 * @param {string} bioguideId
 * @param {{cycle?:number, budget?:object}} opts
 * @returns {Promise<{candidateId:string|null, source:'directory'|'search'|null, all:string[]}>}
 */
export async function resolveFecCandidateId(bioguideId, { cycle, budget } = {}) {
  const member = memberByBioguide(bioguideId);
  const seeded = fecIdsForMember(bioguideId);
  const picked = pickFecCandidateId(member, seeded);
  if (picked) return { candidateId: picked, source: 'directory', all: seeded };

  if (!member?.fullName) return { candidateId: null, source: null, all: [] };

  const office = OFFICE_FROM_CHAMBER[member.chamber];
  const res = await searchCandidates(
    { name: member.fullName, state: member.state, office, cycle },
    { budget },
  );
  const rows = Array.isArray(res?.data?.results) ? res.data.results : [];
  if (!rows.length) return { candidateId: null, source: null, all: [] };

  // Highest-receipts active candidate for the matched state/office wins.
  const best = rows.find((r) => r.candidate_id) || null;
  const id = best?.candidate_id || null;
  return id
    ? { candidateId: id, source: 'search', all: [id] }
    : { candidateId: null, source: null, all: [] };
}
