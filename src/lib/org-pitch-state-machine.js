/**
 * Stock pitch stage transition rules (server-enforced).
 */

export const STAGE_TRANSITIONS = [
  {
    from: 'idea',
    to: 'research_approved',
    permission: 'pitch.approve_research',
    roles: ['portfolio_manager', 'executive'],
  },
  {
    from: 'idea',
    to: 'rejected',
    permission: 'pitch.approve_research',
    roles: ['portfolio_manager', 'executive'],
    requireNote: true,
  },
  {
    from: 'research_approved',
    to: 'research_in_progress',
    permission: 'pitch.submit',
    roles: ['analyst', 'portfolio_manager', 'executive'],
    auto: true,
  },
  {
    from: 'research_in_progress',
    to: 'pm_review',
    permission: 'pitch.submit',
    roles: ['analyst'],
    minDeliverables: 1,
  },
  {
    from: 'pm_review',
    to: 'research_in_progress',
    permission: 'pitch.review_pm',
    roles: ['portfolio_manager', 'executive'],
    requireNote: true,
  },
  {
    from: 'pm_review',
    to: 'committee_scheduled',
    permission: 'pitch.review_pm',
    roles: ['portfolio_manager', 'executive'],
    requireMeetingAt: true,
  },
  {
    from: 'committee_scheduled',
    to: 'committee_vote',
    permission: 'pitch.schedule_committee',
    roles: ['executive'],
  },
  {
    from: 'committee_vote',
    to: 'decision',
    permission: 'pitch.final_decision',
    roles: ['executive'],
    minVotes: 1,
  },
];

export function canEditThesis(pitch) {
  return (
    pitch.status === 'active' &&
    ['idea', 'research_approved', 'research_in_progress'].includes(pitch.stage)
  );
}

export function findTransition(from, to) {
  return STAGE_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

export function validateTransition(pitch, toStage, ctx) {
  const { viewer, deliverableCount, note, committee_meeting_at, voteCount } = ctx;

  if (pitch.status !== 'active' && toStage !== 'rejected') {
    return { ok: false, error: 'Pitch is no longer active' };
  }

  if (toStage === 'rejected') {
    if (!note?.trim()) return { ok: false, error: 'Rejection rationale required' };
    return { ok: true, terminalStatus: 'rejected' };
  }

  const rule = findTransition(pitch.stage, toStage);
  if (!rule) {
    return { ok: false, error: `Invalid transition: ${pitch.stage} → ${toStage}` };
  }

  if (!rule.roles.includes(viewer.role)) {
    return { ok: false, error: `Role ${viewer.role} cannot move pitch to ${toStage}` };
  }

  if (rule.requireNote && !note?.trim()) {
    return { ok: false, error: 'Note required for this transition' };
  }

  if (rule.requireMeetingAt && !committee_meeting_at) {
    return { ok: false, error: 'Committee meeting date required' };
  }

  if (rule.minDeliverables && deliverableCount < rule.minDeliverables) {
    return { ok: false, error: 'At least one deliverable required before PM review' };
  }

  if (rule.minVotes && voteCount < rule.minVotes) {
    return { ok: false, error: 'At least one vote required before closing' };
  }

  if (viewer.role === 'portfolio_manager' && viewer.team_id && pitch.team_id !== viewer.team_id) {
    return { ok: false, error: 'PM can only act on pitches in their team' };
  }

  return { ok: true };
}
