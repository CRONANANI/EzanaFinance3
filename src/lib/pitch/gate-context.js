/**
 * Gate inputs for pitches, assembled from the database.
 *
 * `buildGateContexts` reads each table once for a whole list of pitches, so a
 * board of pitches costs the same number of queries as one pitch. The single
 * pitch form, `buildGateContext`, is the same code with a list of one, so the
 * board, the gate panel and POST .../advance can never disagree.
 *
 * Never trusts the client. The recusal engine is not wired yet, so
 * unrecusedConflicts stays an honest stub; every other input is real.
 *
 * Blind ballots: while a pitch's meeting is blind and open, the ballots
 * themselves may not be readable by this member (see sql.md of the Pitch
 * Pipeline redesign), so the participation count comes from
 * `countBallotsReceived`, which works under both row policies.
 */
import { isBlindOpen } from './ballot-privacy.js';

// IC voter roles mirror IC_VOTER_ROLES in org-pitch-api-helpers.js.
const IC_ROLES = ['executive', 'portfolio_manager'];
const SIGNOFF_TIERS = new Set([
  'senior_analyst',
  'portfolio_manager',
  'senior_portfolio_manager',
  'vice_president',
  'executive',
  'president',
]);

/* The counting function may not exist yet (it is created by the owner from
   sql.md). Remember that for ten minutes so a board load does not ask again
   for every request. */
let rpcMissingUntil = 0;

/**
 * Ballots received per pitch (recusals excluded), as { pitchId: count }.
 * Uses the counting function when the database has it, which keeps the count
 * right once members can no longer read each other's ballots during a blind
 * vote. Otherwise counts the rows this member can read.
 */
export async function countBallotsReceived(supabase, pitchIds) {
  const ids = [...new Set((pitchIds || []).filter(Boolean))];
  const out = Object.fromEntries(ids.map((id) => [id, 0]));
  if (!ids.length) return out;

  if (typeof supabase.rpc === 'function' && Date.now() >= rpcMissingUntil) {
    try {
      const { data, error } = await supabase.rpc('org_pitch_ballot_counts', {
        p_pitch_ids: ids,
      });
      if (!error && Array.isArray(data)) {
        for (const row of data) out[row.pitch_id] = Number(row.received) || 0;
        return out;
      }
      rpcMissingUntil = Date.now() + 10 * 60 * 1000;
    } catch {
      rpcMissingUntil = Date.now() + 10 * 60 * 1000;
    }
  }

  const { data } = await supabase
    .from('org_pitch_votes')
    .select('pitch_id, recused')
    .in('pitch_id', ids);
  for (const v of data || []) {
    if (!v.recused) out[v.pitch_id] = (out[v.pitch_id] || 0) + 1;
  }
  return out;
}

/* Attached to a meeting that is blind and open, or that cannot be read. */
const sealedFor = (pitch, meetingById) => {
  if (!pitch.ic_meeting_id) return false;
  const meeting = meetingById.get(pitch.ic_meeting_id);
  return meeting ? isBlindOpen(meeting) : true;
};

const group = (rows, key) => {
  const map = new Map();
  for (const r of rows || []) {
    const k = r[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return map;
};

/**
 * @param {object} supabase the signed-in member's client
 * @param {string} orgId
 * @param {object[]} pitches raw pitch rows (id, team_id, ticker, ic_meeting_id, analyst_member_id)
 * @returns {Promise<Map<string, object>>} gate context by pitch id
 */
export async function buildGateContexts(supabase, orgId, pitches) {
  const list = (pitches || []).filter((p) => p?.id);
  const out = new Map();
  if (!list.length) return out;

  const ids = list.map((p) => p.id);
  const teamIds = [...new Set(list.map((p) => p.team_id).filter(Boolean))];
  const meetingIds = [...new Set(list.map((p) => p.ic_meeting_id).filter(Boolean))];
  const tickers = [
    ...new Set(list.map((p) => (p.ticker ? String(p.ticker).toUpperCase() : null)).filter(Boolean)),
  ];
  const none = Promise.resolve({ data: [] });

  const [
    deskRes,
    signoffRes,
    deskMeetingRes,
    modelRes,
    delRes,
    crossRes,
    challengeRes,
    teamCountRes,
    voteRes,
    meetingRes,
    rosterRes,
    positionRes,
  ] = await Promise.all([
    teamIds.length
      ? supabase
          .from('org_desk_config')
          .select('team_id, min_senior_signoffs, required_models')
          .in('team_id', teamIds)
      : none,
    supabase
      .from('org_pitch_signoff')
      .select('pitch_id, member_id, in_desk, decision, scope')
      .in('pitch_id', ids),
    supabase
      .from('org_desk_meeting')
      .select('pitch_id, held_at, attendees, attendee_ids, created_at')
      .in('pitch_id', ids)
      .order('created_at', { ascending: false }),
    supabase
      .from('org_pitch_model')
      .select('pitch_id, model_type, file_url, reviewed_at, complete')
      .in('pitch_id', ids),
    supabase.from('org_pitch_deliverables').select('id, pitch_id, kind').in('pitch_id', ids),
    supabase
      .from('org_cross_desk_approval')
      .select('pitch_id, reviewer_member_id, reviewer_team_id, decision')
      .in('pitch_id', ids),
    supabase
      .from('org_pitch_discussion_messages')
      .select(
        'id, pitch_id, status, author:org_members!org_pitch_discussion_messages_author_member_id_fkey(display_name)',
      )
      .in('pitch_id', ids)
      .eq('post_type', 'challenge'),
    supabase.from('org_teams').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase
      .from('org_pitch_votes')
      .select('pitch_id, voter_member_id, vote, recused')
      .in('pitch_id', ids),
    meetingIds.length
      ? supabase
          .from('org_ic_meetings')
          .select('id, status, quorum_pct, threshold, ballot_type, meets_at')
          .in('id', meetingIds)
          .eq('org_id', orgId)
      : none,
    supabase
      .from('org_members')
      .select('id, role, tier, team_id')
      .eq('org_id', orgId)
      .eq('is_active', true),
    tickers.length
      ? supabase
          .from('org_positions')
          .select('id, ticker')
          .eq('org_id', orgId)
          .in('ticker', tickers)
          .eq('is_active', true)
      : none,
  ]);

  const deskByTeam = new Map((deskRes?.data || []).map((d) => [d.team_id, d]));
  const signoffs = group(signoffRes?.data, 'pitch_id');
  const deskMeetings = group(deskMeetingRes?.data, 'pitch_id');
  const models = group(modelRes?.data, 'pitch_id');
  const dels = group(delRes?.data, 'pitch_id');
  const cross = group(crossRes?.data, 'pitch_id');
  const challenges = group(challengeRes?.data, 'pitch_id');
  const votes = group(voteRes?.data, 'pitch_id');
  const meetingById = new Map((meetingRes?.data || []).map((m) => [m.id, m]));
  const roster = rosterRes?.data || [];
  const held = new Set((positionRes?.data || []).map((p) => String(p.ticker).toUpperCase()));
  const teamCount = teamCountRes?.count || 0;

  const eligibleVoters = roster.filter((m) => IC_ROLES.includes(m.role)).length;
  const otherDesks = Math.max(0, teamCount - 1);
  const crossDeskNeeded = otherDesks > 0 ? Math.floor(otherDesks / 2) + 1 : 0;

  /* Participation counts for pitches in an open blind vote come from the
     counting helper; everything else is counted from the rows above. */
  const sealedIds = list.filter((p) => sealedFor(p, meetingById)).map((p) => p.id);
  const sealedCounts = sealedIds.length ? await countBallotsReceived(supabase, sealedIds) : {};

  for (const pitch of list) {
    const deskConfig = deskByTeam.get(pitch.team_id) || null;
    const meeting = meetingById.get(pitch.ic_meeting_id) || null;
    const sealed = sealedFor(pitch, meetingById);
    // Mirrors canSignOff() in api/org/pitches/[pitchId]/signoff/route.js; the
    // author cannot sign off their own pitch.
    const eligibleSeniorCount = roster.filter(
      (m) =>
        m.id !== pitch.analyst_member_id &&
        (m.role === 'executive' || m.role === 'portfolio_manager' || SIGNOFF_TIERS.has(m.tier)),
    ).length;

    const pitchVotes = votes.get(pitch.id) || [];
    const activeVotes = pitchVotes.filter((v) => !v.recused);
    const votesCast = sealed ? (sealedCounts[pitch.id] ?? 0) : activeVotes.length;
    const yes = activeVotes.filter((v) => v.vote === 'yes').length;
    const no = activeVotes.filter((v) => v.vote === 'no').length;
    const decisive = yes + no;
    const quorumPct = meeting?.quorum_pct ?? 50;
    const quorumNeeded = meeting ? Math.max(1, Math.ceil((quorumPct / 100) * eligibleVoters)) : 0;
    const votePassed =
      decisive > 0 &&
      (meeting?.threshold === 'supermajority' ? yes * 3 >= decisive * 2 : yes * 2 > decisive);

    const deskMeetingRow = (deskMeetings.get(pitch.id) || [])[0] || null;
    const attendeeCount = deskMeetingRow
      ? (Array.isArray(deskMeetingRow.attendee_ids) ? deskMeetingRow.attendee_ids.length : 0) ||
        (Array.isArray(deskMeetingRow.attendees) ? deskMeetingRow.attendees.length : 0)
      : 0;
    const pitchChallenges = challenges.get(pitch.id) || [];

    out.set(pitch.id, {
      deskConfig,
      requiredModels: deskConfig?.required_models || [],
      signoffs: signoffs.get(pitch.id) || [],
      deskMeeting: deskMeetingRow ? { ...deskMeetingRow, attendee_count: attendeeCount } : null,
      models: models.get(pitch.id) || [],
      deliverableKinds: (dels.get(pitch.id) || []).map((d) => d.kind),
      crossDeskApprovals: cross.get(pitch.id) || [],
      crossDeskNeeded,
      openChallenges: pitchChallenges
        .filter((c) => c.status === 'open')
        .map((c) => ({ id: c.id, author_name: c.author?.display_name })),
      challengeCount: pitchChallenges.length,
      icMeeting: meeting?.id || null,
      meeting,
      ballotsSealed: sealed,
      votesCast,
      eligibleVoters,
      quorumNeeded,
      voteClosed: meeting?.status === 'closed',
      votePassed,
      viewerVotes: pitchVotes,
      eligibleSeniorCount,
      positionExists: pitch.ticker ? held.has(String(pitch.ticker).toUpperCase()) : false,
      // Recusal engine not wired yet: the one honest stub.
      unrecusedConflicts: 0,
    });
  }
  return out;
}

/** Gate inputs for one pitch. Shared by POST .../advance and GET .../gates. */
export async function buildGateContext(supabase, orgId, pitch) {
  const map = await buildGateContexts(supabase, orgId, [pitch]);
  return map.get(pitch.id);
}
