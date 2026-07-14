/**
 * buildGateContext — assemble the gate inputs for a pitch from the DB.
 *
 * Shared by the advance endpoint (POST .../advance) and the gate-status read
 * endpoint (GET .../gates) so both compute gates from the SAME server-derived
 * facts. Never trusts the client.
 */
export async function buildGateContext(supabase, orgId, pitch) {
  const [
    { data: deskConfig },
    { data: signoffs },
    { data: deskMeetings },
    { data: models },
    { data: dels },
    { data: crossDesk },
    { data: challenges },
    { count: teamCount },
    { data: votes },
    { data: template },
  ] = await Promise.all([
    supabase
      .from('org_desk_config')
      .select('min_senior_signoffs')
      .eq('team_id', pitch.team_id)
      .maybeSingle(),
    supabase.from('org_pitch_signoff').select('member_id, in_desk').eq('pitch_id', pitch.id),
    supabase
      .from('org_desk_meeting')
      .select('held_at, decision')
      .eq('pitch_id', pitch.id)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase.from('org_pitch_model').select('kind, complete').eq('pitch_id', pitch.id),
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
    supabase.from('org_teams').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('org_pitch_votes').select('vote').eq('pitch_id', pitch.id),
    supabase
      .from('org_pitch_templates')
      .select('min_deliverables')
      .eq('org_id', orgId)
      .limit(1)
      .maybeSingle(),
  ]);

  const otherDesks = Math.max(0, (teamCount || 0) - 1);
  const crossDeskNeeded = otherDesks > 0 ? Math.floor(otherDesks / 2) + 1 : 0;
  const requiredDeliverables = template?.min_deliverables ?? 0;
  const votesCast = (votes || []).length;
  const votesFor = (votes || []).filter(
    (v) => v.vote === 'for' || v.vote === 'yes' || v.vote === 'approve',
  ).length;

  return {
    deskConfig: deskConfig || null,
    signoffs: signoffs || [],
    deskMeeting: (deskMeetings && deskMeetings[0]) || null,
    models: models || [],
    requiredDeliverables,
    completedRequiredDeliverables: Math.min(requiredDeliverables, (dels || []).length),
    crossDeskApprovals: crossDesk || [],
    crossDeskNeeded,
    openChallenges: (challenges || []).map((c) => ({
      id: c.id,
      author_name: c.author?.display_name,
    })),
    icMeeting: pitch.ic_meeting_id || null,
    votesCast,
    votesFor,
    quorumNeeded: pitch.ic_meeting_id ? Math.ceil(votesCast || 1) : 0,
    threshold: 'simple',
  };
}
