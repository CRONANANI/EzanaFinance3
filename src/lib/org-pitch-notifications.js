/**
 * Pitch pipeline stage-change notifications, backed by the real Supabase tables.
 * Recipients are resolved from org_members (by role / team) and the pitch is read
 * from org_pitches — no mock data. Delivery drops a message into
 * org_direct_messages for the recipient.
 */

const STAGE_NOTIFY = {
  research_approved: { title: 'Research approved', audience: 'analyst' },
  research_in_progress: { title: 'Research started', audience: 'pm' },
  pm_review: { title: 'Ready for PM review', audience: 'pm' },
  committee_scheduled: { title: 'Committee meeting scheduled', audience: 'voters' },
  committee_vote: { title: 'Committee vote open', audience: 'voters' },
  decision: { title: 'Pitch decided', audience: 'all' },
};

async function memberLabel(supabase, orgId, memberId) {
  if (!memberId) return 'Member';
  const { data } = await supabase
    .from('org_members')
    .select('display_name')
    .eq('org_id', orgId)
    .eq('id', memberId)
    .maybeSingle();
  return data?.display_name?.split(' ')[0] || 'Member';
}

async function notifyMember(supabase, orgId, recipientId, subject, body) {
  if (!supabase || !orgId || !recipientId) return;
  try {
    await supabase.from('org_direct_messages').insert({
      org_id: orgId,
      sender_member_id: recipientId,
      recipient_member_id: recipientId,
      subject,
      body,
      attachment_kind: 'document',
      attachment_ref: 'pitch_pipeline',
      attachment_label: subject,
    });
  } catch (e) {
    console.error('[pitch-notify]', e);
  }
}

async function voterMemberIds(supabase, orgId) {
  const { data } = await supabase
    .from('org_members')
    .select('id, role, sub_role')
    .eq('org_id', orgId)
    .eq('is_active', true);
  return (data || [])
    .filter(
      (m) =>
        m.role === 'executive' || (m.role === 'portfolio_manager' && m.sub_role === 'Senior PM'),
    )
    .map((m) => m.id);
}

export async function notifyStageChange(supabase, orgId, pitchId, toStage, actorId) {
  if (!supabase || !orgId || !pitchId) return;

  const { data: pitch } = await supabase
    .from('org_pitches')
    .select('id, ticker, team_id, analyst_member_id, decision, decision_rationale')
    .eq('org_id', orgId)
    .eq('id', pitchId)
    .maybeSingle();
  if (!pitch) return;

  const cfg = STAGE_NOTIFY[toStage];
  const ticker = pitch.ticker;
  const actor = await memberLabel(supabase, orgId, actorId);

  if (toStage === 'research_approved') {
    await notifyMember(
      supabase,
      orgId,
      pitch.analyst_member_id,
      `${ticker} pitch approved for research`,
      `${actor} approved your ${ticker} pitch for research.`,
    );
  } else if (toStage === 'pm_review') {
    const { data: pm } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('role', 'portfolio_manager')
      .eq('team_id', pitch.team_id)
      .eq('is_active', true)
      .maybeSingle();
    if (pm?.id) {
      const analyst = await memberLabel(supabase, orgId, pitch.analyst_member_id);
      await notifyMember(
        supabase,
        orgId,
        pm.id,
        `${ticker} pitch submitted for PM review`,
        `${analyst} submitted ${ticker} for your review.`,
      );
    }
  } else if (toStage === 'committee_scheduled' || toStage === 'committee_vote') {
    for (const vid of await voterMemberIds(supabase, orgId)) {
      await notifyMember(
        supabase,
        orgId,
        vid,
        `${ticker} — ${cfg?.title || 'Committee update'}`,
        `${ticker} pitch is at stage: ${toStage.replace(/_/g, ' ')}.`,
      );
    }
  } else if (toStage === 'decision' && pitch.decision) {
    await notifyMember(
      supabase,
      orgId,
      pitch.analyst_member_id,
      `${ticker} pitch DECIDED: ${pitch.decision.toUpperCase()}`,
      `Committee decision on ${ticker}: ${pitch.decision}. ${pitch.decision_rationale || ''}`,
    );
  }
}
