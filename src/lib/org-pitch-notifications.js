/**
 * Pitch pipeline stage-change notifications, backed by the real Supabase tables.
 * Recipients are resolved from org_members (by role / team) and the pitch is read
 * from org_pitches — no mock data. Delivery drops a message into
 * org_direct_messages for the recipient.
 */

const STAGE_NOTIFY = {
  screening: { title: 'Moved to screening', audience: 'analyst' },
  cross_desk_review: { title: 'Cross-desk review', audience: 'pm' },
  pitch_scheduled: { title: 'Pitch scheduled for the IC', audience: 'voters' },
  ic_vote: { title: 'IC vote open', audience: 'voters' },
  approved: { title: 'Pitch approved', audience: 'analyst' },
  rejected: { title: 'Pitch rejected', audience: 'analyst' },
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

// Every executive and every portfolio manager may vote on the IC (see the vote
// route), so all of them are notified.
async function voterMemberIds(supabase, orgId) {
  const { data } = await supabase
    .from('org_members')
    .select('id, role')
    .eq('org_id', orgId)
    .eq('is_active', true);
  return (data || [])
    .filter((m) => m.role === 'executive' || m.role === 'portfolio_manager')
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
  if (!cfg) return;
  const ticker = pitch.ticker;
  const actor = await memberLabel(supabase, orgId, actorId);

  if (toStage === 'screening') {
    await notifyMember(
      supabase,
      orgId,
      pitch.analyst_member_id,
      `${ticker} pitch moved to screening`,
      `${actor} moved your ${ticker} pitch to screening.`,
    );
  } else if (toStage === 'cross_desk_review') {
    const { data: pms } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('role', 'portfolio_manager')
      .eq('team_id', pitch.team_id)
      .eq('is_active', true)
      .limit(5);
    const analyst = await memberLabel(supabase, orgId, pitch.analyst_member_id);
    for (const pm of pms || []) {
      await notifyMember(
        supabase,
        orgId,
        pm.id,
        `${ticker} is in cross-desk review`,
        `${analyst}'s ${ticker} pitch has reached cross-desk review.`,
      );
    }
  } else if (toStage === 'pitch_scheduled' || toStage === 'ic_vote') {
    const subject =
      toStage === 'ic_vote' ? `${ticker}: IC vote open` : `${ticker}: pitch scheduled for the IC`;
    for (const vid of await voterMemberIds(supabase, orgId)) {
      await notifyMember(
        supabase,
        orgId,
        vid,
        subject,
        `${ticker} pitch is at stage: ${toStage.replace(/_/g, ' ')}.`,
      );
    }
  } else if (toStage === 'approved' || toStage === 'rejected') {
    const decision = pitch.decision || toStage;
    await notifyMember(
      supabase,
      orgId,
      pitch.analyst_member_id,
      `${ticker} pitch ${toStage}`,
      `Decision on ${ticker}: ${decision}. ${pitch.decision_rationale || ''}`.trim(),
    );
  }
}
