/**
 * Pure FEC candidate-ID picker (no imports), re-exported from join.js and unit
 * tested by scripts/check-fec-join.mjs.
 */

/* FEC candidate IDs encode office and state: H0WV02138 = House, WV, district 02;
   S4WV00159 = Senate, WV. A member's list holds every ID they have filed under,
   so pick the one for the seat they hold now. Latest-listed wins a tie. */
export function pickFecCandidateId(member, fecIds = []) {
  const office = member?.chamber === 'Senate' ? 'S' : member?.chamber === 'House' ? 'H' : null;
  const state = member?.state || null;
  const dist =
    member?.chamber === 'House' && member?.district != null
      ? String(member.district).padStart(2, '0')
      : null;
  const ok = (id) =>
    typeof id === 'string' &&
    id.length >= 9 &&
    (!office || id[0] === office) &&
    (!state || id.slice(2, 4) === state);
  const matches = fecIds.filter(ok);
  const exact = dist ? matches.filter((id) => id.slice(4, 6) === dist) : matches;
  const pool = exact.length ? exact : matches;
  return pool.length ? pool[pool.length - 1] : null;
}
