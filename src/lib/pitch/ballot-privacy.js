/**
 * Blind ballots: what may leave the server while a blind vote is open.
 *
 * A committee meeting can be scheduled with a blind ballot. Until that
 * meeting is closed, nobody may learn how the vote is going or who has
 * voted. The only things a member may be told are:
 *   - how many ballots have been received, out of how many eligible voters;
 *   - their own ballot.
 *
 * Everything else is removed here, on the server, before a response is
 * written: other members' ballots (choice, rationale, name, even the fact
 * that they voted), the running Buy / Pass / Abstain counts, recusal names,
 * and any gate result that depends on the count ("Vote carried").
 *
 * Once the meeting is closed the record is returned in full, as before.
 *
 * Pure: no database, no React. The routes, the loaders, the sample bundle
 * and the tests all call these same functions.
 */

/** A blind meeting that has not been closed yet. */
export function isBlindOpen(meeting) {
  return Boolean(meeting && meeting.ballot_type === 'blind' && meeting.status !== 'closed');
}

const TALLY_KEYS = ['vote_yes_count', 'vote_no_count', 'vote_abstain_count'];

/**
 * A pitch row with the running tally removed. The row keeps every other
 * field. `ballots_sealed` tells the page why the counts are absent.
 */
export function sealPitchRow(row) {
  if (!row) return row;
  const out = { ...row, ballots_sealed: true };
  for (const k of TALLY_KEYS) out[k] = null;
  return out;
}

/**
 * Seal every row whose meeting is blind and still open.
 * @param {object[]} rows pitch rows (each may carry ic_meeting_id)
 * @param {Set<string>|string[]} sealedMeetingIds ids of blind, unclosed meetings
 */
export function sealPitchRows(rows, sealedMeetingIds) {
  const sealed = sealedMeetingIds instanceof Set ? sealedMeetingIds : new Set(sealedMeetingIds);
  if (!sealed.size) return rows || [];
  return (rows || []).map((r) =>
    r?.ic_meeting_id && sealed.has(r.ic_meeting_id) ? sealPitchRow(r) : r,
  );
}

/** Ballots that count toward quorum: every ballot that is not a recusal. */
export function receivedCount(votes) {
  return (votes || []).filter((v) => !v.recused).length;
}

/**
 * What a member may see of the ballots on one pitch.
 *
 * Sealed: `votes` holds the viewer's own ballot or nothing, and `summary`
 * carries only the participation count. Not sealed: every ballot, plus the
 * tally.
 *
 * @param {{ votes: object[], sealed: boolean, viewerMemberId?: string|null,
 *           eligibleCount?: number, quorumPct?: number, received?: number|null }} input
 *   `received` overrides the count taken from `votes` (used when the caller
 *   counted the ballots separately).
 */
export function ballotView({
  votes,
  sealed,
  viewerMemberId = null,
  eligibleCount = 0,
  quorumPct = 50,
  received = null,
}) {
  const all = Array.isArray(votes) ? votes : [];
  const own = viewerMemberId ? all.find((v) => v.voter_member_id === viewerMemberId) || null : null;
  const count = received != null ? received : receivedCount(all);
  const needed = Math.ceil((quorumPct / 100) * eligibleCount);
  const base = {
    sealed: Boolean(sealed),
    received: count,
    eligible: eligibleCount,
    quorum_pct: quorumPct,
    quorum_needed: needed,
    quorum_met: eligibleCount > 0 && count >= needed,
    own: own
      ? {
          id: own.id || null,
          vote: own.vote,
          rationale: own.rationale || '',
          recused: Boolean(own.recused),
          created_at: own.created_at || null,
        }
      : null,
  };
  if (sealed) {
    return { votes: own ? [own] : [], summary: { ...base, tally: null } };
  }
  const active = all.filter((v) => !v.recused);
  return {
    votes: all,
    summary: {
      ...base,
      tally: {
        yes: active.filter((v) => v.vote === 'yes').length,
        no: active.filter((v) => v.vote === 'no').length,
        abstain: active.filter((v) => v.vote === 'abstain').length,
      },
    },
  };
}

/* Gates whose result is a function of how members voted. */
const TALLY_GATES = new Set(['vote_passed']);

/**
 * Gate results for an open blind vote. "Vote carried" would otherwise read
 * "Carried" as soon as Buy leads, which is the tally in one word. Quorum
 * stays: it is the participation count.
 */
export function sealGates(gates) {
  return (gates || []).map((gate) =>
    TALLY_GATES.has(gate.id)
      ? { ...gate, status: 'pending', detail: 'Hidden until the meeting closes' }
      : gate,
  );
}

/**
 * The whole detail payload for one pitch, sealed when it must be. Removes
 * the tally columns, swaps the ballot list for the viewer's view of it, and
 * attaches `ballot` (the summary) for the page.
 */
export function sealPitchDetail(
  detail,
  { sealed, viewerMemberId, eligibleCount, quorumPct, received },
) {
  if (!detail) return detail;
  const view = ballotView({
    votes: detail.votes,
    sealed,
    viewerMemberId,
    eligibleCount,
    quorumPct,
    received,
  });
  const base = sealed ? sealPitchRow(detail) : { ...detail, ballots_sealed: false };
  return { ...base, votes: view.votes, ballot: view.summary };
}
