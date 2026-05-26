import { MOCK_MEMBERS } from '@/lib/orgMockData';
import { mockMemberIdToOrgMemberId } from '@/lib/org-trading-server';
import { getPitchRaw } from '@/lib/org-pitch-store';

const STAGE_NOTIFY = {
  research_approved: { title: 'Research approved', audience: 'analyst' },
  research_in_progress: { title: 'Research started', audience: 'pm' },
  pm_review: { title: 'Ready for PM review', audience: 'pm' },
  committee_scheduled: { title: 'Committee meeting scheduled', audience: 'voters' },
  committee_vote: { title: 'Committee vote open', audience: 'voters' },
  decision: { title: 'Pitch decided', audience: 'all' },
};

function memberLabel(id) {
  return MOCK_MEMBERS.find((m) => m.id === id)?.name?.split(' ')[0] || 'Member';
}

async function notifyMember(supabase, orgId, recipientMockId, subject, body) {
  if (!supabase || !orgId || !recipientMockId) return;
  const recipientId = await mockMemberIdToOrgMemberId(supabase, orgId, recipientMockId);
  if (!recipientId) return;
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

function votersMockIds() {
  return MOCK_MEMBERS.filter(
    (m) => m.role === 'executive' || (m.role === 'portfolio_manager' && m.sub_role === 'Senior PM'),
  ).map((m) => m.id);
}

export async function notifyStageChange(supabase, orgId, pitchId, toStage, actorMockId) {
  const pitch = getPitchRaw(pitchId);
  if (!pitch) return;

  const cfg = STAGE_NOTIFY[toStage];
  const ticker = pitch.ticker;
  const actor = memberLabel(actorMockId);

  if (toStage === 'research_approved') {
    await notifyMember(
      supabase,
      orgId,
      pitch.analyst_member_id,
      `${ticker} pitch approved for research`,
      `${actor} approved your ${ticker} pitch for research.`,
    );
  } else if (toStage === 'pm_review') {
    const pm = MOCK_MEMBERS.find(
      (m) => m.role === 'portfolio_manager' && m.team_id === pitch.team_id,
    );
    if (pm) {
      await notifyMember(
        supabase,
        orgId,
        pm.id,
        `${ticker} pitch submitted for PM review`,
        `${memberLabel(pitch.analyst_member_id)} submitted ${ticker} for your review.`,
      );
    }
  } else if (toStage === 'committee_scheduled' || toStage === 'committee_vote') {
    for (const vid of votersMockIds()) {
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
