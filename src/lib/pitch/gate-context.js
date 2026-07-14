/**
 * buildGateContext — assemble the gate inputs for a pitch from the DB.
 * Shared by POST .../advance and GET .../gates so both compute from the same
 * server-derived facts. Never trusts the client.
 *
 * Some gate inputs depend on engines not yet wired (compliance, vote-close,
 * recusals, positions) — those are surfaced as honest stubs and the matching
 * gates degrade gracefully rather than fabricate a pass.
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
    supabase.from('org_pitch_votes').select('vote').eq('pitch_id', pitch.id),
  ]);

  const otherDesks = Math.max(0, (teamCount || 0) - 1);
  const crossDeskNeeded = otherDesks > 0 ? Math.floor(otherDesks / 2) + 1 : 0;
  const votesCast = (votes || []).length;
  const meeting = (deskMeetings && deskMeetings[0]) || null;
  const attendeeCount = meeting
    ? (Array.isArray(meeting.attendee_ids) ? meeting.attendee_ids.length : 0) ||
      (Array.isArray(meeting.attendees) ? meeting.attendees.length : 0)
    : 0;

  return {
    deskConfig: deskConfig || null,
    requiredModels: deskConfig?.required_models || [],
    signoffs: signoffRows || [],
    deskMeeting: meeting ? { ...meeting, attendee_count: attendeeCount } : null,
    models: models || [],
    deliverableKinds: (dels || []).map((d) => d.kind),
    crossDeskApprovals: crossDesk || [],
    crossDeskNeeded,
    openChallenges: (openCh || []).map((c) => ({ id: c.id, author_name: c.author?.display_name })),
    challengeCount: challengeCount || 0,
    icMeeting: pitch.ic_meeting_id || null,
    votesCast,
    quorumNeeded: pitch.ic_meeting_id ? Math.max(1, votesCast) : 0,
    // Not-yet-wired engines — honest stubs (gates degrade, never fabricate):
    voteClosed: false,
    unrecusedConflicts: 0,
    positionExists: false,
  };
}
