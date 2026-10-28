/**
 * buildGateContext — assemble the gate inputs for a pitch from the DB.
 * Shared by POST .../advance and GET .../gates so both compute from the same
 * server-derived facts. Never trusts the client.
 *
 * The recusal engine is not wired yet, so unrecusedConflicts stays an honest
 * stub; every other input is real.
 */
export async function buildGateContext(supabase, orgId, pitch) {
  const [
    { data: deskConfig },
    { data: signoffRows },
    { data: deskMeetings },
    { data: models },
    { data: dels },
    { data: crossDesk },
    { data: openCh },
    { count: challengeCount },
    { count: teamCount },
    { data: votes },
  ] = await Promise.all([
    supabase
      .from('org_desk_config')
      .select('min_senior_signoffs, required_models')
      .eq('team_id', pitch.team_id)
      .maybeSingle(),
    supabase
      .from('org_pitch_signoff')
      .select('member_id, in_desk, decision, scope')
      .eq('pitch_id', pitch.id),
    supabase
      .from('org_desk_meeting')
      .select('held_at, attendees, attendee_ids')
      .eq('pitch_id', pitch.id)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('org_pitch_model')
      .select('model_type, reviewed_at, complete')
      .eq('pitch_id', pitch.id),
    supabase.from('org_pitch_deliverables').select('id, kind').eq('pitch_id', pitch.id),
    supabase
      .from('org_cross_desk_approval')
      .select('reviewer_member_id, reviewer_team_id, decision')
      .eq('pitch_id', pitch.id),
    supabase
      .from('org_pitch_discussion_messages')
      .select(
        'id, author:org_members!org_pitch_discussion_messages_author_member_id_fkey(display_name)',
      )
      .eq('pitch_id', pitch.id)
      .eq('post_type', 'challenge')
      .eq('status', 'open'),
    supabase
      .from('org_pitch_discussion_messages')
      .select('id', { count: 'exact', head: true })
      .eq('pitch_id', pitch.id)
      .eq('post_type', 'challenge'),
    supabase.from('org_teams').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('org_pitch_votes').select('vote, recused').eq('pitch_id', pitch.id),
  ]);

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

  const [meetingRes, rosterRes, positionRes] = await Promise.all([
    pitch.ic_meeting_id
      ? supabase
          .from('org_ic_meetings')
          .select('id, status, quorum_pct, threshold')
          .eq('id', pitch.ic_meeting_id)
          .eq('org_id', orgId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('org_members').select('id, role, tier').eq('org_id', orgId).eq('is_active', true),
    pitch.ticker
      ? supabase
          .from('org_positions')
          .select('id')
          .eq('org_id', orgId)
          .eq('ticker', String(pitch.ticker).toUpperCase())
          .eq('is_active', true)
          .limit(1)
      : Promise.resolve({ data: [] }),
  ]);

  const meeting = meetingRes?.data || null;
  const roster = rosterRes?.data || [];
  const eligibleVoters = roster.filter((m) => IC_ROLES.includes(m.role)).length;
  // Mirrors canSignOff() in api/org/pitches/[pitchId]/signoff/route.js; the
  // author cannot sign off their own pitch.
  const eligibleSeniorCount = roster.filter(
    (m) =>
      m.id !== pitch.analyst_member_id &&
      (m.role === 'executive' || m.role === 'portfolio_manager' || SIGNOFF_TIERS.has(m.tier)),
  ).length;

  const activeVotes = (votes || []).filter((v) => !v.recused);
  const votesCast = activeVotes.length;
  const yes = activeVotes.filter((v) => v.vote === 'yes').length;
  const no = activeVotes.filter((v) => v.vote === 'no').length;
  const decisive = yes + no;
  const quorumPct = meeting?.quorum_pct ?? 50;
  const quorumNeeded = meeting ? Math.max(1, Math.ceil((quorumPct / 100) * eligibleVoters)) : 0;
  const votePassed =
    decisive > 0 &&
    (meeting?.threshold === 'supermajority' ? yes * 3 >= decisive * 2 : yes * 2 > decisive);

  const otherDesks = Math.max(0, (teamCount || 0) - 1);
  const crossDeskNeeded = otherDesks > 0 ? Math.floor(otherDesks / 2) + 1 : 0;
  const deskMeetingRow = (deskMeetings && deskMeetings[0]) || null;
  const attendeeCount = deskMeetingRow
    ? (Array.isArray(deskMeetingRow.attendee_ids) ? deskMeetingRow.attendee_ids.length : 0) ||
      (Array.isArray(deskMeetingRow.attendees) ? deskMeetingRow.attendees.length : 0)
    : 0;

  return {
    deskConfig: deskConfig || null,
    requiredModels: deskConfig?.required_models || [],
    signoffs: signoffRows || [],
    deskMeeting: deskMeetingRow ? { ...deskMeetingRow, attendee_count: attendeeCount } : null,
    models: models || [],
    deliverableKinds: (dels || []).map((d) => d.kind),
    crossDeskApprovals: crossDesk || [],
    crossDeskNeeded,
    openChallenges: (openCh || []).map((c) => ({ id: c.id, author_name: c.author?.display_name })),
    challengeCount: challengeCount || 0,
    icMeeting: meeting?.id || null,
    votesCast,
    quorumNeeded,
    voteClosed: meeting?.status === 'closed',
    votePassed,
    eligibleSeniorCount,
    positionExists: (positionRes?.data || []).length > 0,
    // Recusal engine not wired yet — the one honest stub.
    unrecusedConflicts: 0,
  };
}
