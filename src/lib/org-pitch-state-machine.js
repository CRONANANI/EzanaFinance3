/**
 * Stock pitch stage transition rules (server-enforced).
 *
 * STAGE NAMING = option (a): internal keys are authoritative here; the design
 * labels (Idea / Screening / Deep Dive / Model Complete / Pitch Scheduled /
 * IC Vote / Approved / In Portfolio / Exited) are mapped in the UI ONLY.
 */

// Internal stage key -> design-facing label (single source of truth for the map).
export const DESIGN_STAGE_LABELS = {
  idea: 'Idea',
  research_approved: 'Screening',
  research_in_progress: 'Deep Dive',
  pm_review: 'Model Complete',
  committee_scheduled: 'Pitch Scheduled',
  committee_vote: 'IC Vote',
  decision: 'Approved',
  in_portfolio: 'In Portfolio',
  exited: 'Exited',
};

// The 7 active kanban stages (idea -> decision). in_portfolio/exited live in the
// tracker + archive lane respectively, never as kanban columns.
export const ACTIVE_STAGES = [
  'idea',
  'research_approved',
  'research_in_progress',
  'pm_review',
  'committee_scheduled',
  'committee_vote',
  'decision',
];

export function designStageLabel(stage) {
  return DESIGN_STAGE_LABELS[stage] || stage;
}

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
    // Gate: cannot schedule to IC without an attached model AND memo.
    requireDeliverableKinds: ['model', 'memo'],
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
  // ── Post-approval lifecycle (2a additions) ──────────────────────────────
  {
    from: 'decision',
    to: 'in_portfolio',
    permission: 'pitch.assign_monitor',
    roles: ['portfolio_manager', 'executive'],
  },
  {
    from: 'in_portfolio',
    to: 'exited',
    permission: 'pitch.assign_monitor',
    roles: ['portfolio_manager', 'executive'],
    requireNote: true, // post-mortem / archive_reason
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
  const {
    viewer,
    deliverableCount = 0,
    deliverableKinds = [],
    note,
    committee_meeting_at,
    voteCount = 0,
  } = ctx;

  if (pitch.status !== 'active' && toStage !== 'rejected') {
    // in_portfolio/exited operate on accepted (non-active) pitches, allow them.
    const postApproval = ['in_portfolio', 'exited'].includes(toStage);
    if (!postApproval) {
      return { ok: false, error: 'Pitch is no longer active' };
    }
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

  if (rule.requireDeliverableKinds?.length) {
    const missing = rule.requireDeliverableKinds.filter((k) => !deliverableKinds.includes(k));
    if (missing.length) {
      return {
        ok: false,
        error: `Attach a ${missing.join(' + ')} before scheduling to the IC`,
        gate: 'model_memo',
      };
    }
  }

  if (rule.minVotes && voteCount < rule.minVotes) {
    return { ok: false, error: 'At least one vote required before closing' };
  }

  if (viewer.role === 'portfolio_manager' && viewer.team_id && pitch.team_id !== viewer.team_id) {
    return { ok: false, error: 'PM can only act on pitches in their team' };
  }

  return { ok: true };
}

/**
 * Cheap, side-effect-free gate probe used by the board so cards can show *why*
 * an advance is blocked without attempting a transition. Returns the next
 * forward transition and whether its gates are currently satisfied.
 */
export function nextForwardGate(pitch, { deliverableKinds = [], deliverableCount = 0 } = {}) {
  const forward = STAGE_TRANSITIONS.find(
    (t) => t.from === pitch.stage && !t.auto && t.to !== 'rejected',
  );
  if (!forward) return null;

  if (forward.requireDeliverableKinds?.length) {
    const missing = forward.requireDeliverableKinds.filter((k) => !deliverableKinds.includes(k));
    if (missing.length) {
      return { to: forward.to, blocked: true, reason: `Needs ${missing.join(' + ')}` };
    }
  }
  if (forward.minDeliverables && deliverableCount < forward.minDeliverables) {
    return { to: forward.to, blocked: true, reason: 'Needs a deliverable' };
  }
  if (forward.requireMeetingAt) {
    return { to: forward.to, blocked: false, reason: 'Set IC meeting date' };
  }
  return { to: forward.to, blocked: false, reason: null };
}
